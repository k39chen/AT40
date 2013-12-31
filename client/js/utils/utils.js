
(function($){

    $.fn.hoverable = function(){
        return $(this)
            .mouseover( function(){$(this).addClass('hover'); })
            .mouseout( function(){$(this).removeClass('hover'); });
    };

})(jQuery);
