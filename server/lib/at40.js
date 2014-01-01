/**
 * AT40 Globals
 */
var AT40_API       = 'http://www.at40.com/top-40/';
var WIKI_SEARCH    = 'http://en.wikipedia.org/w/index.php?search={{song}}+%28Music%29';
var ARTWORK_SEARCH = 'https://www.google.com/search?as_st=y&tbm=isch&hl=en&as_q={{song}}+(Album+Art)&as_epq=&as_oq=&as_eq=&cr=&as_sitesearch=&safe=images&tbs=isz:lt,islt:vga,iar:s';
var YOUTUBE_SEARCH = 'http://www.youtube.com/results?search_query={{song}}+{{artist}}';
var MIN_YEAR       = 2001;

Meteor.publish('Charts',function(){
    return Charts.find();
});
Meteor.publish('Songs',function(){
    return Songs.find();
});


/**
 * @method getChart
 * @param id {Number} The AT40 chart id.
 * @return {Object} Returns the chart data.
 */
 function getChart(id) {
    var data = null;

    // if a chart with this id is already in the AT40X system, then
    // we will use that one instead of returning to the AT40 service.
    var dbChart = Charts.findOne({id:id});
    if (dbChart) {
        data = dbChart;
        console.log('---- Prefetched '+data.songs.length+' songs');
    } else {
        // configure the request to the AT40 service
        var url = AT40_API+'chart/'+id;
        var response = HTTP.get(url);
        var chartObj = {id:id, date:null, songs:[]};

        // see if we have received a healthy response from the AT40 service
        if (response.content) {
            var $ = Cheerio.load(response.content);
            // get the date for this chart
            chartObj.date = (new Date($('.chartabletime h1').text())).valueOf();
            chartObj.year = (new Date(chartObj.date)).getFullYear();
            chartObj.month = (new Date(chartObj.date)).getMonth()+1;

            // process each chart table entry
            $('.chartgray').each(function(){
                var song = parseSong($,$(this),chartObj.date);
                if (song) chartObj.songs.push(song);
            });
            $('.chartwhite').each(function(){
                var song = parseSong($,$(this),chartObj.date);
                if (song) chartObj.songs.push(song);
            });
            // do a quick lexicographic sort of the songs by chart position
            chartObj.songs.sort(function(a,b){
                if (a.position < b.position) return -1;
                if (a.position > b.position) return 1;
                return 0;
            });
            // now that we have aggregated the requested chart data,
            // we will insert it into our Charts collection for 
            // persistent usage.
            Charts.insert(chartObj);

            // return the chart data object
            data = chartObj;
        }
    }
    return data;
}

/**
 * @method parseSong
 * @param $ {Object} The Cheerio object.
 * @param elem {DOM} The DOM element holding the song data.
 * @param date {Date} The date that this song is released.
 * @return {Object} A well-formed AT40X song data model.
 */
function parseSong($,elem,date) {
    // parse the data
    var position    = parseInt($('.align_c:nth-child(1)',elem).html().trim(),10),
        albumArt    = $('.chartsong img',elem).attr('src').trim(),
        artist      = $('.chart_song',elem).text().trim(),
        song        = $('.chartartist',elem).html(),
        song        = song.substr(song.indexOf('<br>')+4).trim(),
        artworkLink = ARTWORK_SEARCH.urlize('song',song),
        youtubeLink = YOUTUBE_SEARCH.urlize('song',song).urlize('artist',artist),
        infoLink    = WIKI_SEARCH.urlize('song',song);

    console.log('---- Fetching song: ['+position+'] '+song+' - '+artist);

    // if the song object is new, we will create a new document in the 
    // Songs collection.
    var dbSong = Songs.findOne({artist:artist,song:song});
    if (!dbSong) {
        
        // we will attempt to get the album/publishDate if this is the first time loading this song
        var album = null, 
            publishDate = null,
            genres = [],
            url = $('.chartcd a', elem).attr('href');

        // take precautions to make sure that this is a valid url
        if (url && url.indexOf('http:') >= 0) {
            var filterUrl = Cheerio.load(url);
            newUrl = filterUrl('a').attr('href');
            if (newUrl) {
                url = newUrl;
            }
            url = url.substr(url.indexOf('http:'));

            // retrieve the iTunes HTML object and parse it for the desired fields
            var itunesResponse = HTTP.get(url);
            if (itunesResponse.content) {
                var itunesDOM = Cheerio.load(itunesResponse.content);
                album = itunesDOM('#title h1').text().trim();
                publishDate = itunesDOM('.release-date').html();
                if (publishDate) {
                    publishDate = (new Date(publishDate.substr(publishDate.indexOf('</span>')+7).trim())).valueOf();
                } else {
                    publishDate = null;
                }
                itunesDOM('.genre a').each(function(){
                    var genre = itunesDOM(this).text();
                    if (genre && genre != 'Music') genres.push(genre.trim());
                });
            }
        } else {
            console.log('**** SKIPPED FETCHING EXTRA DATA FOR '+song+' - '+artist);
        }

        // FYI: Songs use {artist,song} as a primary key
        var songObj = {
            artist: artist,
            song: song,
            album: album,
            publishDate: publishDate,
            genres: genres,
            progress: [{date:date,position:position}],
            albumArt: albumArt,
            artworkLink: artworkLink,
            youtubeLink: youtubeLink,
            infoLink: infoLink
        };
        // insert the song object
        var songId = Songs.insert(songObj);
        dbSong = Songs.findOne({_id:songId});
    } else {
        // see if there is a progress entry for this date and entry
        var exists = false;
        for (var i=0; i<dbSong.progress.length; i++) {
            var progressEntry = dbSong.progress[i];
            if (date == progressEntry.date && position == progressEntry.position) {
                exists = true;
                break;
            }
        }
        // if no such entry exists, then we will add it to the song's chart history
        if (!exists) {
            Songs.update({_id:dbSong._id},{$push: {
                progress: {date:date,position:position}
            }});
        }
    }
    // return the song data (as stored in the Chart collection)
    return {
        position: position,
        artist: artist,
        song: song
    };
}

/**
 * Exported API methods for the client to use as necessary.
 */
Meteor.methods({
    /**
     * Performs a smart retrieval from the AT40 service to fetch
     * missing or requested AT40 chart/song data.
     *
     * @method getAT40
     * @param options {Object} User-specified fetch options
     * @return {Object} List of chart data.
     */
    getAT40: function(options){
        console.log('Performing batch AT40X fetch...');
        var charts = {};
        var currentYear = (new Date()).getFullYear();
        for (var year=currentYear; year>=MIN_YEAR; year--) {
            charts[parseInt(year,10)] = Meteor.call('getAnnualCharts',year);
        }
        return charts;
    },
    /**
     * @method getChartInYear
     * @param year {Number} The target year
     * @return {Array} The array of chart data in this month.
     */
    getAnnualCharts: function(year) {
        console.log('Fetching AT40X charts for YEAR: '+year+'...');
        var charts = {};
        for (var month=12; month>=1; month--) {
            month = month<10 ? '0'+month : ''+month;
            charts[parseInt(month,10)] = Meteor.call('getMonthlyCharts',month,year);
        }
        return charts;
    },
    /**
     * @method getChartsInMonth
     * @param year {Number} The target year.
     * @param month {String} A zero-buffered month string.
     * @return {Array} The array of chart data in this month.
     */
    getMonthlyCharts: function(month,year) {
        console.log('Fetching AT40X charts for MONTH/YEAR: '+month+'/'+year+'...');
        var url = AT40_API+year+'/'+month;
        var response = HTTP.get(url);
        var charts = [];
        if (response.content) {
            var $ = Cheerio.load(response.content);
            $('#chartintlist').each(function(index){
                // get the chart data from the AT40 service
                var id = parseInt($('a',this).attr('href').replace('/top-40/chart/',''),10);
                charts.push(Meteor.call('getChart', id));
            });
        }
        return charts;
    },
    /**
     * Retrieves chart data with full song data.
     *
     * @method getChart
     * @param id {Number} The chart id.
     * @return {Object} The chart object.
     */
    getChart: function(id) {
        console.log('-- Getting Chart: ' + id);
        var chart = getChart(id);
        if (chart && chart.songs) {
            // lets put together the corresponding song details and send
            // a complete chart response to the client
            for (var i=0; i<chart.songs.length; i++) {
                var song = chart.songs[i];
                var dbSong = Songs.findOne({artist:song.artist,song:song.song});
                // normalize the song data for client usage
                if (dbSong) {
                    song.albumArt     = dbSong.albumArt;
                    song.album        = dbSong.album;
                    song.year         = dbSong.year;
                    song.genres       = dbSong.genres;
                    song.artworkLink  = dbSong.artworkLink;
                    song.youtubeLink  = dbSong.youtubeLink;
                    song.infoLink     = dbSong.infoLink;
                    song.acquired     = dbSong.acquired;
                    song.rating       = dbSong.rating;
                }
            }
            // just another sort for good measure
            chart.songs.sort(function(a,b){
                if (a.position < b.position) return -1;
                if (a.position > b.position) return 1;
                return 0;
            });
            // remove the _id field, since it is db-specific
            delete chart['_id'];
        }
        return chart;
    },
    /**
     * Searches current collection for year,month,week matching for chart
     *
     * @method getChartByDate
     * @param year {Number} The year.
     * @param month {Number} The month.
     * @param week {Number} The week.
     * @return {Object} The chart object.
     */
    getChartByDate: function(year,month,week) {
        if (week <= 0) return null;
        var charts = Charts.find({year:year,month:month},{sort:{date:1}});
        if (week > charts.count()) return null;
        return charts.fetch()[week-1];
    },
    /**
     * Get sorted charted by date.
     *
     * @method getSortedChartByDate
     * @param sortType {String} The sort type string.
     * @param year {Number} The year.
     * @param month {Number} The month.
     * @param week {Number} The week.
     * @return {Object} The chart object.
     */
    getSortedChartByDate: function(sortType,year,month,week){
        var chart = Meteor.call('getChartByDate',year,month,week);
        if (chart) {
            var newSonglist = chart.songs;
            switch (sortType) {
                case 'rank':
                    newSonglist = chart.songs.sort(function(a,b){
                        return a.position-b.position;
                    });
                    break;
                case 'song':
                    newSonglist = chart.songs.sort(function(a,b){
                        if (a.song < b.song) return -1;
                        if (a.song > b.song) return 1;
                        return 0;
                    });
                    break;
                case 'artist':
                    newSonglist = chart.songs.sort(function(a,b){
                        if (a.artist < b.artist) return -1;
                        if (a.artist > b.artist) return 1;
                        return 0;
                    });
                    break;
                default:
                    break;
            }
            chart.songs = newSonglist;
            return chart;
        }
        return null;
    },
    /**
     * Gets the most recent date.
     *
     * @method getMostRecentDate
     * @return {Object} A {year,month,week} object describing the most recent date.
     */
    getMostRecentDate: function(){
        var chart = Charts.findOne({},{limit:1,sort:{date:-1}});
        if (chart) {
            return {
                year: chart.year, 
                month: chart.month, 
                week: Meteor.call('getChartWeek',chart.id)
            };
        }
        return null;
    },
    /**
     * Gets the chart week.
     *
     * @method getChartWeek
     * @param id {Number} The chart id.
     * @return {Number} A 1-offset week numbering.
     */
    getChartWeek: function(id) {
        var chart = Charts.findOne({id:id});
        if (chart) {
            var year = chart.year;
            var month = chart.month;
            var charts = Charts.find({year:year,month:month},{sort:{date:1}}).fetch();
            for (var i=0; i<charts.length; i++) {
                if (charts[i].id == id) {
                    return i+1;
                }
            }
        }
        return -1;
    },
    /**
     * Gets the best possible date, from the given preselected fields.
     *
     * @method getBestDate
     * @param year {Number} The year.
     * @param month {Number} The month.
     * @param week {Number} The week.
     * @return {Object} The best date object.
     */
    getBestDate: function(year,month,week){
        var years = Meteor.call('getCandidateYears');
        var newYear = -1;
        for (var i=0;i<years.length;i++){
            newYear = years[i];
            if (years[i] == year) break;
        }
        var months = Meteor.call('getCandidateMonths',newYear);
        var newMonth = -1;
        for (var i=0;i<months.length;i++){
            newMonth = months[i];
            if (months[i] == month) break;
        }
        var weeks = Meteor.call('getCandidateWeeks',newYear,newMonth);
        var newWeek = -1;
        for (var i=0;i<weeks.length;i++){
            newWeek = weeks[i];
            if (weeks[i] == week) break;
        }
        return {year:newYear,month:newMonth,week:newWeek};
    },
    /**
     * Gets the possible years.
     *
     * @method getCandidateYears
     * @return {Array} The array of possible years
     */
    getCandidateYears: function(){
        var years = [];
        var minYear = 2000;
        var maxYear = (new Date()).getFullYear();
        for (var year=minYear; year<=maxYear; year++){
            if (Charts.findOne({year:year})) {
                years.push(year);
            }
        }
        return years;
    },
    /**
     * Gets the candidate months.
     *
     * @method getCandidateMonths
     * @param year {Number} The preselected year.
     * @return {Array} The array of possible months
     */
    getCandidateMonths: function(year){
        var months = [];
        var minMonth = 1;
        var maxMonth = 12;
        for (var month=minMonth; month<=maxMonth; month++){
            if (Charts.findOne({year:year,month:month})) {
                months.push(month);
            }
        }
        return months;
    },
    /**
     * Gets the candidate weeks.
     *
     * @method getCandidateWeeks
     * @param year {Number} The preselected year.
     * @param month {Number} The preselected month.
     * @return {Array} The array of possible weeks.
     */
    getCandidateWeeks: function(year,month){
        var numCharts = Charts.find({year:year,month:month}).count();
        var weeks = [];
        for (var i=0; i<numCharts; i++) {
            weeks.push(i+1);
        }
        return weeks;
    }
});

String.prototype.urlize = function(key,value){
    return this.replace('{{'+key+'}}',value.replace(/ /g,'+'));
}