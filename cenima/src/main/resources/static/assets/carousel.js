(() => {
  const carousel = document.querySelector('.film-carousel');
  if (!carousel) return;
  const slides = [...carousel.querySelectorAll('.film-slide')];
  const status = document.getElementById('carousel-status');
  let index = 0, touchStart = null, dragged = false;
  function move(direction) {
    index = (index + direction + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== index; });
    status.textContent = slides[index].getAttribute('aria-label');
  }
  carousel.querySelector('[data-carousel=previous]').addEventListener('click', () => move(-1));
  carousel.querySelector('[data-carousel=next]').addEventListener('click', () => move(1));
  carousel.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
  });
  carousel.addEventListener('pointerdown', event => {
    if (event.target.closest('a,button') && !event.target.closest('.film-open')) return;
    dragged = false; touchStart = {x:event.clientX,y:event.clientY};
  });
  carousel.addEventListener('pointerup', event => {
    if (!touchStart) return;
    const dx=event.clientX-touchStart.x,dy=event.clientY-touchStart.y;
    touchStart=null;
    if (Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)) {dragged=true;move(dx<0?1:-1);}
  });
  carousel.addEventListener('pointercancel', () => {touchStart=null;});
  carousel.addEventListener('click', event => {
    const button=event.target.closest('.film-open');
    if (!button || dragged) {dragged=false;return;}
    document.dispatchEvent(new CustomEvent('star:movie',{detail:{id:button.dataset.featuredId}}));
  });
})();
