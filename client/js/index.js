// Meteor.call('getChart', 27758, function(err,result){
//     console.log(result);
// });

// Meteor.call('getMonthlyCharts', 11, 2013, function(err,result){
//     console.log(result);
// });

// Meteor.call('getAnnualCharts', 2012, function(err,result){
//     console.log(result);
// });

// Meteor.call('getAnnualCharts', 2013, function(err,result){
//     console.log(result);
// });

// Meteor.call('getAT40', function(err,result){
//     console.log(result);
// });

// Meteor.call('getChartByDate', 2013, 11, 2, function(err,result){
//     console.log(result);
// });

// Meteor.call('getCandidateYears', function(err,result){
//     console.log(result);
// });

// Meteor.call('getCandidateMonths', 2013, function(err,result){
//     console.log(result);
// });

// Meteor.call('getCandidateWeeks', 2013, 11, function(err,result){
//     console.log(result);
// });

// Meteor.call('getMostRecentDate', function(err,result){
//     console.log(result);
// });

/** UTILS **/
function getMonthName(month){
    var monthNames = [null, "January", "February", "March", "April", "May", "June",
"July", "August", "September", "October", "November", "December"];
    return monthNames[month];
};

/** MAIN **/
$(function(){

    // add scrollbars where necessary
    $('#mainpane-content').mCustomScrollbar();
    $('.shortlist').mCustomScrollbar();

    // initialize components
    Datepicker.init();
    Chartsort.init();


});

/** SIDEPANE: CHARTLIST **/
Template.chartlist.songs = function(){
    var chartlist = Session.get('chartlist');
    return chartlist ? chartlist.songs : null;
}
Template.chartlist.rendered = function(){
    $('#chartlist').mCustomScrollbar();
    $('#chartlist .song')
        .hoverable()
        .click(function(){
            $('#chartlist .song').removeClass('active');
            $(this).addClass('active');
        });
}

/** MAINPANE: TOPBAR **/
Template.mainpane.title = function(){ return 'Charts'; }
Template.mainpane.icon = function(){ return 'fa-signal'; }
Template.mainpane.username = function(){ return 'Kevin Chen'; }
Template.mainpane.connectivity = function(){ return 'Log out'; }

/** MAINPANE: SONG INORMATION **/
Template.songInformation.rank = function(){ return 4; }
Template.songInformation.songname = function(){ return 'Pumped Up Kicks'; }
Template.songInformation.artist = function(){ return 'Foster the People'; }
Template.songInformation.album = function(){ return 'New Worlds'; }

/** MAINPANE RELATED MUSIC **/
Template.relatedMusic.rank = function(){ return 4; }
Template.relatedMusic.artist = function(){ return 'Foster the People'; }
Template.relatedMusic.album = function(){ return 'New Worlds'; }
Template.relatedMusic.genre = function(){ return 'Pop'; }

/** COMPONENTS: CHARTSORT **/
var Chartsort = {
    init: function() {
        $('.chartsort-option')
            .hoverable()
            .click(function(){
                Chartsort.setSort($(this).attr('value'));
            });

        // by default, sort by rank
        Chartsort.setSort('rank');
    },
    getSetSort: function(){
        return $('.chartsort-option.active').attr('value');
    },
    setSort: function(sortType){
        $('.chartsort-option').removeClass('active');
        $('.chartsort-option[value="'+sortType+'"]').addClass('active');

        // relist the chart ordering
        Datepicker.loadChart({
            year: Datepicker.getSetYear(),
            month: Datepicker.getSetMonth(),
            week: Datepicker.getSetWeek()
        });
    }
};

/** COMPONENTS: DATEPICKER **/
var Datepicker = {
    init: function(){
        // make all datepicker dropdowns hoverable
        $('.datepicker-dropdown-value').hoverable();

        // set the default date
        Meteor.call('getMostRecentDate',Datepicker.setDate);
    },
    getMonthName: function(month){
        var monthNames = [null, "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
        return monthNames[month];
    },
    getSetYear: function() {
        return $('#datepicker-year').attr('value');
    },
    getSetMonth: function() {
        return $('#datepicker-month').attr('value');
    },
    getSetWeek: function() {
        return $('#datepicker-week').attr('value');
    },
    setDate: function(err,date){

        console.log('setDate:',date);

        // empty all the dropdowns
        $('.datepicker-dropdown-options').empty();

        // set empty datepicker data
        if (!date) {
            $('#datepicker-year .datepicker-dropdown-value > .text').text('No Years Available');
            $('#datepicker-month .datepicker-dropdown-value > .text').text('No Months Available');
            $('#datepicker-week .datepicker-dropdown-value > .text').text('No Weeks Available');
            $('#datepicker-year').attr('value',-1);
            $('#datepicker-month').attr('value',-1);
            $('#datepicker-week').attr('value',-1);
            return;
        }

        var year = date.year, month = date.month, week = date.week;

        // update dropdown trigger text
        $('#datepicker-year .datepicker-dropdown-value > .text').text(year);
        $('#datepicker-month .datepicker-dropdown-value > .text').text(Datepicker.getMonthName(month));
        $('#datepicker-week .datepicker-dropdown-value > .text').text('Week '+week);

        // set the values in attribute
        $('#datepicker-year').attr('value',year);
        $('#datepicker-month').attr('value',month);
        $('#datepicker-week').attr('value',week);

        // populate the year dropdown
        Meteor.call('getCandidateYears', function(err,years){
            for (var i=0; i<years.length; i++) {
                var option = $('<div>')
                    .addClass('datepicker-dropdown-option')
                    .attr('value',years[i])
                    .append('<span class="text">'+years[i]+'</span>')
                    .append('<i class="icon fa fa-check"></i>')
                    .appendTo('#datepicker-year .datepicker-dropdown-options')
                    .addClass(year == years[i] ? 'active' : '')
                    .click(function(){
                        // we need to make sure that we can preserve whatever 
                        // preselected month/week number we have, otherwise we will fall
                        // back onto the next best week number
                        Meteor.call('getBestDate',
                            $(this).attr('value'),
                            Datepicker.getSetMonth(),
                            Datepicker.getSetWeek(),
                            Datepicker.setDate
                        )
                    });
            } 
            $('#datepicker-year.datepicker-dropdown-menu').dropit({
                triggerEl: '.datepicker-dropdown-value',
                submenuEl: '.datepicker-dropdown-options'
            });
            $('#datepicker-year .datepicker-dropdown-option').hoverable();
        });
        // populate the month dropdown
        Meteor.call('getCandidateMonths', year, function(err,months){
            for (var i=0; i<months.length; i++) {
                var option = $('<div>')
                    .addClass('datepicker-dropdown-option')
                    .attr('value',months[i])
                    .append('<span class="text">'+Datepicker.getMonthName(months[i])+'</span>')
                    .append('<i class="icon fa fa-check"></i>')
                    .appendTo('#datepicker-month .datepicker-dropdown-options')
                    .addClass(month == months[i] ? 'active' : '')
                    .click(function(){
                        // we need to make sure that we can preserve whatever 
                        // preselected week number we have, otherwise we will fall
                        // back onto the next best week number
                        Meteor.call('getBestDate',
                            Datepicker.getSetYear(),
                            $(this).attr('value'),
                            Datepicker.getSetWeek(),
                            Datepicker.setDate
                        )
                    });
            } 
            $('#datepicker-month.datepicker-dropdown-menu').dropit({
                triggerEl: '.datepicker-dropdown-value',
                submenuEl: '.datepicker-dropdown-options'
            });
            $('#datepicker-month .datepicker-dropdown-option').hoverable();
        });
        // populate the week dropdown
        Meteor.call('getCandidateWeeks', year, month, function(err,weeks){
            for (var i=0; i<weeks.length; i++) {
                var option = $('<div>')
                    .addClass('datepicker-dropdown-option')
                    .attr('value',weeks[i])
                    .append('<span class="text">Week '+weeks[i]+'</span>')
                    .append('<i class="icon fa fa-check"></i>')
                    .appendTo('#datepicker-week .datepicker-dropdown-options')
                    .addClass(week == weeks[i] ? 'active' : '')
                    .click(function(){
                        // we can straight up set this date because setting this option
                        // is guaranteed to yield a chart object
                        Datepicker.setDate(null, {
                            year: Datepicker.getSetYear(),
                            month: Datepicker.getSetMonth(),
                            week: $(this).attr('value')
                        });
                    });
            }
            $('#datepicker-week.datepicker-dropdown-menu').dropit({
                triggerEl: '.datepicker-dropdown-value',
                submenuEl: '.datepicker-dropdown-options'
            });
            $('#datepicker-week .datepicker-dropdown-option').hoverable();
        });

        // load the chart corresponding to the specified date
        Datepicker.loadChart(date);
    },
    loadChart: function(date){
        Meteor.call('getSortedChartByDate',Chartsort.getSetSort(),date.year,date.month,date.week,function(err,chartlist){
            console.log(chartlist);
            Session.set('chartlist',chartlist);
        });
    }
}