Template.chartList.list = function() {
    return Charts.find();
}

$(document).ready(function(){


    Meteor.call('getAT40', function(err,result){
        console.log(result);
        //$('body').append(JSON.stringify(result));
    });

    $('#send-email-btn').click(function(){
        Meteor.call('sendEmail',
            'AT40X@notifications.com',
            'k39chen@gmail.com',
            'Hot Off The Charts!',
            Template.emailContent({
                message:"You must see this, it's amazing!",
                url:"http://at40x.meteor.com/",
                title:"Amazing stuff, click me!"
            })
        );
    });


});