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

$(function(){

})


Template.mainpane.title = function(){
    return 'Charts';
}
Template.mainpane.icon = function(){
    return 'fa-signal';
}
Template.mainpane.username = function(){
    return 'Kevin Chen';
}
Template.mainpane.connectivity = function(){
    return 'Log out';
}