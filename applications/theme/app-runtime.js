/* EduManager Pro — adaptations communes aux applications Windows et Android.
   Chargé en tout premier dans <head> par la version « application » de index.html.
   (Le thème « Cabinet » et le mode Jour/Nuit sont dans index.html lui-même,
    pour le site web comme pour les applications.)
   - désactive le service worker (les fichiers sont déjà dans l'application) ;
   - sur Android : impression native, téléchargements (Excel, Word, PDF)
     et ouverture des liens externes (WhatsApp, e-mail…). */
(function () {
  'use strict';
  var root = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');

  // Pas de service worker dans l'application : évite de garder une ancienne
  // version en cache après une mise à jour de l'APK / de l'EXE.
  window._swRegistered = true;
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = function () {
        return Promise.reject(new Error('Service worker désactivé dans l\'application'));
      };
    }
  } catch (e) { /* rien */ }

  // ── Windows (Electron) : impression avec la bonne orientation ─────────
  // Les pages d'impression (État des inscriptions, listes…) demandent
  // « A4 paysage » en CSS, mais l'impression Windows partait en portrait et
  // couchait le tableau. On remplace window.print() dans la fenêtre
  // d'impression par l'impression d'Electron, en lui passant l'orientation.
  if (window.electronApp && window.electronApp.isElectron && window.electronApp.imprimer) {
    var INJECTION = '<script>window.print=function(){try{window.electronApp.imprimer()}catch(e){}};<\/script>';
    var openElectron = window.open;
    window.open = function (url, cible, options) {
      url = url ? String(url) : '';
      if (url.indexOf('blob:') !== 0) return openElectron.apply(window, arguments);
      fetch(url).then(function (r) { return r.text(); }).then(function (html) {
        html = /<head[^>]*>/i.test(html)
          ? html.replace(/<head[^>]*>/i, function (m) { return m + INJECTION; })
          : INJECTION + html;
        var u = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
        openElectron.call(window, u, cible || '_blank', options || 'width=1100,height=850');
        setTimeout(function () { URL.revokeObjectURL(u); }, 60000);
      }).catch(function (e) { console.error('Impression :', e); });
      return { closed: false, close: function () {}, focus: function () {}, document: { write: function () {}, close: function () {} } };
    };
  }

  var natif = window.EduManagerNatif; // fourni par MainActivity (Android uniquement)
  if (!natif) return;
  root.classList.add('app-android');

  function estExterne(url) {
    return /^(https?:|mailto:|tel:|sms:|whatsapp:|intent:)/i.test(url) &&
      url.indexOf('://localhost') === -1;
  }

  function blobVersBase64(blob) {
    return new Promise(function (ok, ko) {
      var r = new FileReader();
      r.onload = function () { ok(String(r.result).split(',')[1] || ''); };
      r.onerror = ko;
      r.readAsDataURL(blob);
    });
  }

  function lireUrl(url) {
    return fetch(url).then(function (r) { return r.blob(); });
  }

  // ── Impression : la WebView Android ne gère pas window.print() ni les
  //    fenêtres blob. On transmet le HTML au service d'impression Android
  //    (qui permet aussi « Enregistrer en PDF »).
  function imprimerHtml(html) {
    var m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    var titre = m ? m[1].replace(/<[^>]+>/g, '').trim() : 'EduManager Pro';
    natif.imprimer(html, titre || 'EduManager Pro');
  }

  window.print = function () {
    imprimerHtml('<!DOCTYPE html>' + root.outerHTML);
  };

  var openOrig = window.open;
  window.open = function (url, cible, options) {
    url = url ? String(url) : '';
    if (url.indexOf('blob:') === 0) {
      lireUrl(url).then(function (b) { return b.text(); }).then(imprimerHtml)
        .catch(function (e) { console.error('Impression :', e); });
      return fenetreFactice();
    }
    if (estExterne(url)) {
      natif.ouvrirLien(url);
      return null;
    }
    if (!url || url === 'about:blank') {
      // Fenêtre vide dans laquelle le code écrit avec document.write puis print()
      return fenetreFactice();
    }
    return openOrig.apply(window, arguments);
  };

  function fenetreFactice() {
    var contenu = '';
    var w = {
      closed: false,
      close: function () { w.closed = true; },
      focus: function () {},
      print: function () { if (contenu) imprimerHtml(contenu); },
      addEventListener: function () {},
      location: { href: 'about:blank' },
      document: {
        open: function () { contenu = ''; },
        write: function (s) { contenu += s; },
        writeln: function (s) { contenu += s + '\n'; },
        close: function () {
          var html = contenu;
          setTimeout(function () { if (!w.closed && html) { w.closed = true; imprimerHtml(html); } }, 300);
        }
      }
    };
    return w;
  }

  var TYPES = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    pdf: 'application/pdf',
    csv: 'text/csv',
    json: 'application/json',
    zip: 'application/zip',
    html: 'text/html',
    txt: 'text/plain',
    png: 'image/png',
    jpg: 'image/jpeg'
  };
  function typeFichier(nom, type) {
    if (type && type !== 'application/octet-stream') return type.split(';')[0];
    var ext = (String(nom).split('.').pop() || '').toLowerCase();
    return TYPES[ext] || 'application/octet-stream';
  }

  // ── Téléchargements : <a download href="blob:..."> (Excel, Word, PDF, sauvegardes)
  function telecharger(a) {
    var href = a.href || '';
    var nom = a.getAttribute('download') || 'fichier';
    if (href.indexOf('blob:') !== 0 && href.indexOf('data:') !== 0) return false;
    lireUrl(href).then(function (blob) {
      return blobVersBase64(blob).then(function (b64) {
        natif.enregistrerFichier(b64, nom, typeFichier(nom, blob.type));
      });
    }).catch(function (e) { console.error('Téléchargement :', e); });
    return true;
  }

  var clickOrig = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute('download') && telecharger(this)) return;
    var href = this.href || '';
    if (estExterne(href) && (this.target === '_blank' || /^(mailto|tel|sms|whatsapp)/i.test(href))) {
      natif.ouvrirLien(href);
      return;
    }
    return clickOrig.apply(this, arguments);
  };

  var dispatchOrig = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function (ev) {
    if (this instanceof HTMLAnchorElement && ev && ev.type === 'click' &&
        this.hasAttribute('download') && telecharger(this)) return true;
    return dispatchOrig.apply(this, arguments);
  };

  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    if (a.hasAttribute('download')) {
      if (telecharger(a)) ev.preventDefault();
      return;
    }
    var href = a.href || '';
    if (estExterne(href) && (a.target === '_blank' || /^(mailto|tel|sms|whatsapp)/i.test(href))) {
      ev.preventDefault();
      natif.ouvrirLien(href);
    }
  }, true);
})();
