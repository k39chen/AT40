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
    $('#mainpane-content').mCustomScrollbar();
    $('#chartlist').mCustomScrollbar();
    $('.shortlist').mCustomScrollbar();

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


Template.songInformation.rank = function(){
    return 4;
}
Template.songInformation.songname = function(){
    return 'Pumped Up Kicks';
}
Template.songInformation.artist = function(){
    return 'Foster the People';
}
Template.songInformation.album = function(){
    return 'New Worlds';
}



Template.relatedMusic.rank = function(){
    return 4;
}
Template.relatedMusic.artist = function(){
    return 'Foster the People';
}
Template.relatedMusic.album = function(){
    return 'New Worlds';
}
Template.relatedMusic.genre = function(){
    return 'Pop';
}