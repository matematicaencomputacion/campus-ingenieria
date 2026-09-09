/* Entrada por voz de un solo número; la validación sigue siendo manual. */
(function (global) {
  "use strict";
  var small = "cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis diecisiete dieciocho diecinueve veinte veintiuno veintidos veintitres veinticuatro veinticinco veintiseis veintisiete veintiocho veintinueve".split(" ");
  var tens = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
  function integer(text) {
    if (/^\d+$/.test(text)) return text;
    var n = small.indexOf(text);
    if (n >= 0) return String(n);
    if (tens[text]) return String(tens[text]);
    var parts = text.split(" y ");
    n = small.indexOf(parts[1]);
    return parts.length === 2 && tens[parts[0]] && n > 0 && n < 10 ? String(tens[parts[0]] + n) : null;
  }
  function parseNumber(raw) {
    var text = String(raw).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/−/g, "-").trim().replace(/[.!?]+$/, "").replace(/\s+/g, " ");
    var sign = "";
    if (/^(menos\s+|negativo\s+|-\s*)/.test(text)) {
      sign = "-"; text = text.replace(/^(menos\s+|negativo\s+|-\s*)/, "");
    } else text = text.replace(/^(mas\s+|positivo\s+|\+\s*)/, "");
    var parts = text.split(/\s*(?:coma|punto|[.,])\s*/);
    if (parts.length > 2) return null;
    var whole = integer(parts[0]);
    if (whole === null) return null;
    var fraction = "";
    if (parts.length === 2) {
      fraction = integer(parts[1]);
      if (fraction === null) {
        var digits = parts[1].split(" ").map(function (word) { return small.indexOf(word); });
        if (!digits.length || digits.some(function (n) { return n < 0 || n > 9; })) return null;
        fraction = digits.join("");
      }
      if (!fraction) return null;
      fraction = "." + fraction;
    }
    var value = Number(sign + whole + fraction);
    return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER ? String(value) : null;
  }

  function attach(table, button, status) {
    var Recognition = global.SpeechRecognition || global.webkitSpeechRecognition;
    var session = null;
    function activeInput() { return table.querySelector(".fx-input:not(:disabled)"); }
    function sync() {
      if (session && (!session.input.isConnected || session.input.disabled || activeInput() !== session.input)) cancel("Dictado cancelado: cambió la casilla activa.");
      button.disabled = !Recognition || !activeInput();
      button.textContent = session ? "Cancelar dictado" : "Dictar";
      button.setAttribute("aria-pressed", String(!!session));
    }
    function cancel(message) {
      if (session) {
        var old = session;
        session = null;
        clearTimeout(old.timer);
        try { old.recognition.abort(); } catch (_) { /* Already ended. */ }
      }
      if (message) status.textContent = message;
      sync();
    }
    button.addEventListener("click", function () {
      if (session) { cancel("Dictado cancelado."); return; }
      var input = activeInput();
      if (!Recognition || !input) return;
      var recognition;
      try { recognition = new Recognition(); } catch (_) {
        status.textContent = "No se pudo iniciar el dictado. Podés escribir la respuesta."; return;
      }
      var current = { recognition: recognition, input: input, timer: null };
      session = current;
      recognition.lang = "es-AR";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = function (event) {
        if (session !== current || activeInput() !== input || !input.isConnected) return;
        var result = event.results[event.resultIndex || 0];
        if (!result || !result.isFinal) return;
        var value = parseNumber(result[0].transcript);
        cancel(value === null ? "No entendí un único número. Probá otra vez o escribilo." : "Revisá el número y confirmá con OK o Enter.");
        if (value !== null) {
          input.value = value;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.focus();
        }
      };
      recognition.onerror = function (event) {
        if (session !== current) return;
        var messages = {
          "not-allowed": "Permití el micrófono en el navegador para dictar.",
          "service-not-allowed": "El navegador no permite el servicio de dictado.",
          "audio-capture": "No se encontró un micrófono disponible.",
          "no-speech": "No escuché un número. Probá otra vez.",
          "network": "No se pudo conectar al servicio de dictado. Podés escribir la respuesta."
        };
        cancel(messages[event.error] || "No se pudo completar el dictado. Podés escribir la respuesta.");
      };
      recognition.onend = function () {
        if (session === current) cancel("No recibí un número. Probá otra vez o escribilo.");
      };
      status.textContent = "Escuchando… Decí un número, por ejemplo: menos uno coma cinco.";
      sync();
      current.timer = setTimeout(function () {
        if (session === current) cancel("Terminó la escucha. Probá otra vez o escribilo.");
      }, 15000);
      try { recognition.start(); } catch (_) {
        cancel("No se pudo iniciar el micrófono. Podés escribir la respuesta.");
      }
    });
    table.addEventListener("input", function () { if (session) cancel("Dictado cancelado al escribir."); });
    new MutationObserver(sync).observe(table, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
    global.addEventListener("pagehide", function () { if (session) cancel("Dictado cancelado al salir de la lección."); });
    if (!Recognition) status.textContent = "Este navegador no admite dictado. Podés escribir la respuesta.";
    sync();
  }
  global.CampusNumberDictation = { parseNumber: parseNumber, attach: attach };
})(window);
