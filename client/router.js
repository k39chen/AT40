// map relative paths to corresponding templates/views
var Router = Backbone.Router.extend({
    routes: {
        'admin': 'admin',
        ':any': 'index',
        '': 'index'
    },
    index: function(){
        Session.set('currentPage','homePage');
        this.navigate('/');
    },
    admin: function(){
        Session.set('currentPage','adminPage');
        this.navigate('/admin');
    }
});
// instanitate the router that we have just created
var app = new Router;

// start tracking the history of the router
Backbone.history.start({pushState:true});

function isPageShown(pageName) {
    return Session.get('currentPage') == pageName;
}

Template.homePage.shown = isPageShown('homePage');
Template.adminPage.shown = isPageShown('adminPage');