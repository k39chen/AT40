var HomeView = {
    init: function(){
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
    }
}

Template.chartList.list = function() {
    return Charts.find();
}

HomeView.init();