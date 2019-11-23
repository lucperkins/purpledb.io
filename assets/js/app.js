$(() => {
  anchors.options = {
    icon: '#'
  };

  anchors.add('.content h1, .content h2, .content h3, .content h4');

  const threshold = $('.hero').height(),
    navbar = $('.navbar');

  $(window).scroll(() => {
    if (window.scrollY > threshold) {
      navbar.css('visibility', 'visible');
    } else {
      navbar.css('visibility', 'hidden');
    }
  });
});
