/**
 * AT40 Globals
 */
var AT40_API       = 'http://www.at40.com/top-40/';
var WIKI_SEARCH    = 'http://en.wikipedia.org/w/index.php?search={{song}}+%28Music%29';
var ARTWORK_SEARCH = 'https://www.google.com/search?as_st=y&tbm=isch&hl=en&as_q={{song}}+(Album+Art)&as_epq=&as_oq=&as_eq=&cr=&as_sitesearch=&safe=images&tbs=isz:lt,islt:vga,iar:s';
var MIN_YEAR       = 2001;

/**
 * @method getChartInYear
 * @param year {Number} The target year
 */
function getChartsInYear(year) {
    for (var month=12; month>=1; month--) {
        month = month<10 ? '0'+month : ''+month;
        getChartsInMonth(year,month);
        break;
    }
}
/**
 * @method getChartsInMonth
 * @param year {Number} The target year
 * @param month {String} A zero-buffered month string
 */
function getChartsInMonth(year,month) {
    var url = AT40_API+year+'/'+month;
    var response = HTTP.get(url);
    if (response.content) {
        var $ = Cheerio.load(response.content);
        $('#chartintlist').each(function(index){
            var resource_uri = $('a',this).attr('href');
            var id = resource_uri.replace('/top-40/chart/','');
            getChart(parseInt(id,10));
        });
    }
    return null;
}

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
        artworkLink = ARTWORK_SEARCH.replace('{{song}}',song.replace(/ /g,'+'));
        infoLink    = WIKI_SEARCH.replace('{{song}}',song.replace(/ /g,'+'));

    // if the song object is new, we will create a new document in the 
    // Songs collection.
    var dbSong = Songs.findOne({artist:artist,song:song});
    if (!dbSong) {
        // FYI: Songs use {artist,song} as a primary key
        var songObj = {
            artist: artist,
            song: song,
            progress: [{date:date,position:position}],
            albumArt: albumArt,
            artworkLink: artworkLink,
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
                // sort the progress history in ascending order
                progress: {$each: [{date:date,position:position}], $sort: {date:1}}
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
        var currentYear = (new Date()).getFullYear();
        for (var year=currentYear; year>=MIN_YEAR; year--) {
            getChartsInYear(year);
            break;
        }
    },
    /**
     * Retrieves chart data with full song data.
     *
     * @method getChart
     * @param id {Number} The chart id.
     * @return {Object} The chart object.
     */
    getChart: function(id) {
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
                    song.artworkLink  = dbSong.artworkLink;
                    song.infoLink     = dbSong.infoLink;
                    song.acquired     = dbSong.acquired;
                    song.rating       = dbSong.rating;
                    if (Object.keys(dbSong.progress).length > 0) {
                        song.progress = dbSong.progress;
                    }
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
