var AT40_API = 'http://www.at40.com/top-40/';
var MIN_YEAR = 2001;

/**
 * @method getChartInYear
 * @param year {Number} The target year
 */
function getChartsInYear(year) {
    for (var month=11; month>=1; month--) {
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
            console.log('------------------------------------------');
        });
    }
    return null;
}

/**
 * @method getChart
 * @param id {Number} The AT40 chart id
 * @return array|null Returns the array of songs in the chart, 
 *     otherwise null if the chart data could not be retrieved.
 */function getChart(id) {
    var url = AT40_API+'chart/'+id;
    var response = HTTP.get(url);
    var chart = [];
    if (response.content) {
        var $ = Cheerio.load(response.content);
        // process each chart table entry
        $('.chartgray').each(function(){
            var song = parseSong($,$(this));
            if (song) chart.push(song);
        });
        $('.chartwhite').each(function(){
            var song = parseSong($,$(this));
            if (song) chart.push(song);
        });
        return chart;
    }
    return null;
}

/**
 * @method parseSong
 * @param $ {Object} The Cheerio object.
 * @param elem {DOM} The DOM element holding the song data.
 * @return {Object} A well-formed AT40X song data model.
 */
function parseSong($,elem) {
    
    var thisWeek = $('.align_c:nth-child(1)',elem).html().trim(),
        lastWeek = $('.align_c:nth-child(2)',elem).html().trim(),
        albumArt = $('.chartsong img',elem).attr('src').trim(),
        artist   = $('.chart_song',elem).text().trim(),
        songName = $('.chartartist',elem).html(),
    songName = songName.substr(songName.indexOf('<br>')+4).trim();

    var songObj = {
        thisWeek: parseInt(thisWeek,10),
        lastWeek: lastWeek == '-' ? null : parseInt(lastWeek,10),
        albumArt: albumArt,
        artist: artist,
        song: songName
    };

    return songObj;
}

Meteor.methods({

    /**
     * Performs a smart retrieval from the AT40 service to fetch
     * missing or requested AT40 chart/song data.
     *
     * @method getAT40Data
     * @param options {Object} User-specified fetch options
     * @return {Object} List of chart data.
     */
    getAT40ChartData: function(options){

        var chart = getChart(27758);
        return chart;

        var currentYear = (new Date()).getFullYear();
        for (var year=currentYear; year>=MIN_YEAR; year--) {
            getChartsInYear(year);
            break;
        }
    }

});
