Template.chartList.list = function() {
    return Charts.find();
}

$(document).ready(function(){

    
    // Meteor.call('getChart', 27758, function(err,result){
    //     console.log(result);
    // });

    // Meteor.call('getMonthlyCharts', 11, 2013, function(err,result){
    //     console.log(result);
    // });

    // Meteor.call('getAnnualCharts', 2013, function(err,result){
    //     console.log(result);
    // });

    // Meteor.call('getAT40', function(err,result){
    //     console.log(result);
    // });


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