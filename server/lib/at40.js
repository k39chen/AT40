var AT40_API = 'http://www.at40.com/top-40/';

Meteor.methods({

    getAT40Data: function(params){
        var response = HTTP.get(AT40_API+'2006');
        if (response.content) {
            var $ = Cheerio.load(response.content);
            $('#chartintlist').each(function(index){
                console.log( index+ " : : : : :" +$(this).html() );
            });
        }
        return null;
    }

});