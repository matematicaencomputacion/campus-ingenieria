/*! Campus Ingeniería · mock de cola Top-K (prototipo, sin backend). */
(function (global) {
  "use strict";

  global.CAMPUS_PENDING_QUEUE = {
    defaultK: 10,
    allowedK: [5, 10, 15],
    items: [
      { id: "l200-wm", title: "L200 · Lineal · working memory · juego", href: "leccion-lineal-working-memory.html", rank: 1, status: "pending" },
      { id: "l183-cara", title: "L183 · Inversa · sonrisa / cara triste · juego", href: "leccion-inversa-cara-juego.html", rank: 2, status: "pending" },
      { id: "l182-triste", title: "L182 · Inversa · cara triste · play", href: "leccion-inversa-cara-triste-play.html", rank: 3, status: "pending" },
      { id: "l181-sonrisa", title: "L181 · Inversa · sonrisa · play", href: "leccion-inversa-sonrisa-play.html", rank: 4, status: "pending" },
      { id: "l001-lineales", title: "L1 · Funciones lineales", href: "leccion-lineales.html", rank: 5, status: "done" },
      { id: "l021-recta-play", title: "L21 · Recta · play · ordenada-pendiente", href: "leccion-lineal-play.html", rank: 6, status: "done" },
      { id: "l023-ordenada", title: "L23 · Recta · juego · ordenada", href: "leccion-lineal-juego-ordenada.html", rank: 7, status: "pending" },
      { id: "l156-lineal-51", title: "L156 · Lineal · 5.1 · play", href: "leccion-lineal-51-play.html", rank: 8, status: "pending" },
      { id: "l119-dom-prohibido", title: "L119 · Dominio · número prohibido · play", href: "leccion-dominio-numero-prohibido-play.html", rank: 9, status: "pending" },
      { id: "l120-dom-den", title: "L120 · Dominio · denominador ≠ 0 · play", href: "leccion-dominio-denominador-play.html", rank: 10, status: "pending" },
      { id: "l121-dom-poly", title: "L121 · Dominio · sin denominador · polinomios", href: "leccion-dominio-sin-denominador-play.html", rank: 11, status: "pending" },
      { id: "l123-dom-raiz", title: "L123 · Dominio · raíz · radicando ≥ 0", href: "leccion-dominio-raiz-regla-play.html", rank: 12, status: "pending" },
      { id: "l124-dom-raiz-hoja", title: "L124 · Dominio · raíz · hoja 2 · play", href: "leccion-dominio-raiz-ejercicios-play.html", rank: 13, status: "pending" },
      { id: "l125-dom-exp", title: "L125 · Dominio · exponencial · a^{f(x)}", href: "leccion-dominio-exponencial-regla-play.html", rank: 14, status: "pending" },
      { id: "l109-detector", title: "L109 · Función · detector · play", href: "leccion-funcion-detector-play.html", rank: 15, status: "pending" },
      { id: "l126-trozos", title: "L126 · A trozos · hoja 3.1 · play", href: "leccion-trozos-31-play.html", rank: 16, status: "pending" },
      { id: "l132-comp", title: "L132 · Composición · máquinas en cadena", href: "leccion-composicion-maquinas-play.html", rank: 17, status: "pending" },
      { id: "l149-inversa", title: "L149 · Inversa · 9.1 · play", href: "leccion-inversa-91-play.html", rank: 18, status: "pending" },
      { id: "l041-exp", title: "L41 · Exponencial · play · piso · P", href: "leccion-exponencial-play.html", rank: 19, status: "pending" },
      { id: "l160-eco", title: "L160 · Economía · mapa UDL · play", href: "leccion-economia-enfoque-play.html", rank: 20, status: "pending" }
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
