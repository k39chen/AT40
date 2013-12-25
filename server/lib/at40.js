/**
 * AT40 Globals
 */
var AT40_API       = 'http://www.at40.com/top-40/';
var WIKI_SEARCH    = 'http://en.wikipedia.org/w/index.php?search={{song}}+%28Music%29';
var ARTWORK_SEARCH = 'https://www.google.com/search?as_st=y&tbm=isch&hl=en&as_q={{song}}+(Album+Art)&as_epq=&as_oq=&as_eq=&cr=&as_sitesearch=&safe=images&tbs=isz:lt,islt:vga,iar:s';
var YOUTUBE_SEARCH = 'http://www.youtube.com/results?search_query={{song}}+{{artist}}';
var MIN_YEAR       = 2001;

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
        
        // we will attempt to get the album/releaseDate if this is the first time loading this song
        var album = null, 
            releaseDate = null,
            genres = [],
            url = $('.chartcd a', elem).attr('href');

        // retrieve the iTunes HTML object and parse it for the desired fields
        var itunesResponse = HTTP.get(url);
        if (itunesResponse.content) {
            var itunesDOM = Cheerio.load(itunesResponse.content);
            album = itunesDOM('#title h1').text().trim();
            releaseDate = itunesDOM('.release-date').html();
            if (releaseDate) {
                releaseDate = (new Date(releaseDate.substr(releaseDate.indexOf('</span>')+7).trim())).valueOf();
            } else {
                releaseDate = null;
            }
            itunesDOM('.genre a').each(function(){
                var genre = itunesDOM(this).text();
                if (genre) genres.push(genre.trim());
            });
        }

        // FYI: Songs use {artist,song} as a primary key
        var songObj = {
            artist: artist,
            song: song,
            album: album,
            releaseDate: releaseDate,
            genres: genres,
            progress: [{date:date,position:position}],
            albumArt: albumArt,
            artworkLink: artworkLink,
            youtubeLink: youtubeLink,
            infoLink: infoLink,
            acquired: false,
            rating: 0
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
    }
});

String.prototype.urlize = function(key,value){
    return this.replace('{{'+key+'}}',value.replace(/ /g,'+'));
}