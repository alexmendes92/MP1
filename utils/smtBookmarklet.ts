// Utilitário com o código do Favorito/Bookmarklet para o SMT dos Correios
// Permite autopreencher e extrair dados da tela do formulário do SMT

export const SMT_BOOKMARKLET_SCRIPT = `(function () {
  'use strict';
  var HUD_ID = 'smt-autofill-hud';
  var TOAST_ID = 'smt-autofill-toast';
  var prevHud = document.getElementById(HUD_ID);
  if (prevHud) prevHud.remove();
  var prevToast = document.getElementById(TOAST_ID);
  if (prevToast) prevToast.remove();

  function setReactInputValue(input, val) {
    if (!input || val === undefined || val === null) return false;
    val = String(val).trim();
    if (!val) return false;
    try {
      input.focus();
      var valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (valueSetter && valueSetter.set) {
        valueSetter.set.call(input, val);
      } else {
        input.value = val;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      return true;
    } catch (err) {
      console.warn('[SMT-Autofill] Erro ao disparar evento React:', err);
      input.value = val;
      return false;
    }
  }

  function expandirCamposProprietarios() {
    var trigger = document.querySelector('.CustomCollapsible-proprietarios__trigger');
    if (trigger && (trigger.classList.contains('is-closed') || !trigger.classList.contains('is-open'))) {
      trigger.click();
      return true;
    }
    var botoes = document.querySelectorAll('a.botao, button, .botao');
    for (var i = 0; i < botoes.length; i++) {
      var b = botoes[i];
      if ((b.textContent || '').toUpperCase().includes('CAMPOS PROPRIETÁRIOS')) {
        b.click();
        return true;
      }
    }
    return false;
  }

  function formatarCNJ(txt) {
    var digits = (txt || '').replace(/\\D/g, '');
    if (digits.length === 20) {
      return digits.slice(0, 7) + '-' + digits.slice(7, 9) + '.' + digits.slice(9, 13) + '.' + digits.slice(13, 14) + '.' + digits.slice(14, 16) + '.' + digits.slice(16, 20);
    }
    return (txt || '').trim();
  }

  function formatarCEP(txt) {
    var digits = (txt || '').replace(/\\D/g, '');
    if (digits.length === 8) {
      return digits.slice(0, 5) + '-' + digits.slice(5, 8);
    }
    return (txt || '').trim();
  }

  function extrairDadosTexto(rawText) {
    if (!rawText || typeof rawText !== 'string') return {};
    var text = rawText.trim();
    var dados = { processo: '', nome: '', cep: '', numero: '', complemento: '', tratamento: '' };
    var cnjMatch = text.match(/\\b\\d{7}-\\d{2}\\.\\d{4}\\.8\\.26\\.\\d{4}\\b/);
    if (cnjMatch) {
      dados.processo = cnjMatch[0];
    } else {
      var cnj20Match = text.match(/\\b\\d{20}\\b/);
      if (cnj20Match) {
        dados.processo = formatarCNJ(cnj20Match[0]);
      }
    }
    var cepMatch = text.match(/\\b\\d{5}-\\d{3}\\b/);
    if (cepMatch) {
      dados.cep = cepMatch[0];
    } else {
      var cepLabelMatch = text.match(/cep[:\\s]*(\\d{5}-?\\d{3}|\\d{8})\\b/i);
      if (cepLabelMatch) {
        dados.cep = formatarCEP(cepLabelMatch[1]);
      } else {
        var raw8 = text.match(/\\b(0\\d{7}|[1-9]\\d{7})\\b/);
        if (raw8 && (!dados.processo || !dados.processo.includes(raw8[1]))) {
          dados.cep = formatarCEP(raw8[1]);
        }
      }
    }
    var numLabelMatch = text.match(/(?:n[º°.]?|número|num|n)[:\\s]*([0-9]+[A-Za-z]?|s\\/n|sn)\\b/i);
    if (numLabelMatch) {
      dados.numero = numLabelMatch[1];
    } else {
      var numAposVirgula = text.match(/,\\s*([0-9]{1,6})\\b(?!\\s*[-.])/);
      if (numAposVirgula) {
        dados.numero = numAposVirgula[1];
      }
    }
    var compLabelMatch = text.match(/\\b(?:complemento|compl)[:\\s]+([^\\n\\r,]+)/i);
    if (compLabelMatch) {
      dados.complemento = compLabelMatch[1].trim();
    } else {
      var compWordMatch = text.match(/\\b(?:apto\\.?|apartamento|ap\\.?|bloco|bl\\.?|casa|cj\\.?|conjunto|quadra|qd\\.?|sala|fundos|sobrado|lote|km)\\s*([0-9a-zA-Z\\s-]+?)(?=[,.\\n\\r]|$)/i);
      if (compWordMatch) {
        dados.complemento = compWordMatch[0].trim();
      }
    }
    var nomeLabelMatch = text.match(/(?:nome(?:\\s+completo)?|destinat[áa]rio|parte|v[íi]tima|investigado|requerido)[:\\s]*([^\\n\\r,;]+)/i);
    if (nomeLabelMatch) {
      dados.nome = nomeLabelMatch[1].trim();
    } else {
      var boPrefixMatch = text.match(/^([A-ZÀ-Úa-z\\s]{4,70})(?:,\\s*(?:brasileir|solteir|casad|divorciad|vi[uú]v|residente|domiciliad|portador|nascid|filh|rg|cpf))/i);
      if (boPrefixMatch) {
        dados.nome = boPrefixMatch[1].trim();
      } else {
        var antesVirgula = text.split(',')[0].trim();
        if (antesVirgula.length >= 5 && antesVirgula.length <= 60 && !/\\d/.test(antesVirgula) && !/processo|autos|inquérito/i.test(antesVirgula)) {
          var palavrasAntes = antesVirgula.split(/\\s+/);
          if (palavrasAntes.length >= 2) {
            dados.nome = antesVirgula;
          }
        }
        if (!dados.nome) {
          var linhas = text.split(/[\\r\\n]+/);
          for (var i = 0; i < linhas.length; i++) {
            var l = linhas[i].trim();
            if (l.length >= 5 && l.length <= 80 && !/\\d{5}/.test(l) && !/processo|autos|inquérito/i.test(l)) {
              var palavras = l.split(/\\s+/);
              if (palavras.length >= 2 && palavras[0].length >= 2) {
                dados.nome = l.replace(/[;,\\.]+$/, '').trim();
                break;
              }
            }
          }
        }
      }
    }
    if (/\\b(?:senhora|sra\\.?|dona|dra\\.?)\\b/i.test(text)) {
      dados.tratamento = 'Senhora';
    } else {
      dados.tratamento = 'Senhor';
    }
    return dados;
  }

  function extrairDadosDoFormularioSMT() {
    var resultado = {
      nome: '',
      cep: '',
      numero: '',
      complemento: '',
      logradouro: '',
      bairro: '',
      cidade: '',
      uf: '',
      processo: '',
      tratamento: ''
    };

    var inpNome = document.querySelector('input[name="nomeContato"], input#nomeContato, input[name*="nome"]');
    if (inpNome && inpNome.value) resultado.nome = inpNome.value.trim();

    var inpCep = document.querySelector('input[name="cep"], input#cep, input[name*="cep"]');
    if (inpCep && inpCep.value) resultado.cep = formatarCEP(inpCep.value.trim());

    var inpNum = document.querySelector('input[name="endereco.numero"], input#numero, input[name*="numero"]');
    if (inpNum && inpNum.value) resultado.numero = inpNum.value.trim();

    var inpCompl = document.querySelector('input[name="endereco.complemento"], input#complemento, input[name*="complemento"]');
    if (inpCompl && inpCompl.value) resultado.complemento = inpCompl.value.trim();

    var inpLog = document.querySelector('input[name="endereco.logradouro"], input#logradouro, input[name*="logradouro"], input[name*="rua"]');
    if (inpLog && inpLog.value) resultado.logradouro = inpLog.value.trim();

    var inpBairro = document.querySelector('input[name="endereco.bairro"], input#bairro, input[name*="bairro"]');
    if (inpBairro && inpBairro.value) resultado.bairro = inpBairro.value.trim();

    var inpCidade = document.querySelector('input[name="endereco.cidade"], input#cidade, input[name*="cidade"], input[name*="municipio"]');
    if (inpCidade && inpCidade.value) resultado.cidade = inpCidade.value.trim();

    var inpUf = document.querySelector('input[name="endereco.uf"], select[name="endereco.uf"], input#uf, select#uf');
    if (inpUf && inpUf.value) resultado.uf = inpUf.value.trim();

    var inpProc = document.querySelector('input[name="campoproprietarioValor1"]');
    if (inpProc && inpProc.value) {
      resultado.processo = inpProc.value.trim();
    } else {
      var labels = document.querySelectorAll('.tabelaCamposProprietarios .campo label, .campo label, label');
      for (var i = 0; i < labels.length; i++) {
        if ((labels[i].textContent || '').toUpperCase().includes('PROCESSO')) {
          var parentCampo = labels[i].closest('.campo, div, tr');
          if (parentCampo) {
            var procInput = parentCampo.querySelector('input');
            if (procInput && procInput.value) {
              resultado.processo = procInput.value.trim();
              break;
            }
          }
        }
      }
    }

    var inpTrat = document.querySelector('input[name="pronomeTratamento"], select[name="pronomeTratamento"]');
    if (inpTrat && inpTrat.value) resultado.tratamento = inpTrat.value.trim();

    if (!resultado.nome) {
      var allText = document.body ? (document.body.innerText || '') : '';
      var d = extrairDadosTexto(allText);
      if (d.nome) resultado.nome = d.nome;
      if (d.cep && !resultado.cep) resultado.cep = d.cep;
      if (d.numero && !resultado.numero) resultado.numero = d.numero;
      if (d.complemento && !resultado.complemento) resultado.complemento = d.complemento;
      if (d.processo && !resultado.processo) resultado.processo = d.processo;
    }

    return resultado;
  }

  function aplicarNoFormularioSMT(dados) {
    var preenchidos = [];
    var inputNome = document.querySelector('input[name="nomeContato"]');
    if (inputNome && dados.nome) {
      if (setReactInputValue(inputNome, dados.nome)) {
        preenchidos.push('Nome');
        var containerErro = inputNome.closest('.campo.erro');
        if (containerErro) containerErro.classList.remove('erro');
      }
    }
    var inputCep = document.querySelector('input[name="cep"]');
    if (inputCep && dados.cep) {
      var cepFmt = formatarCEP(dados.cep);
      if (setReactInputValue(inputCep, cepFmt)) {
        preenchidos.push('CEP');
      }
    }
    var inputNumero = document.querySelector('input[name="endereco.numero"]');
    if (inputNumero && dados.numero) {
      if (setReactInputValue(inputNumero, dados.numero)) {
        preenchidos.push('Número');
      }
    }
    var inputCompl = document.querySelector('input[name="endereco.complemento"]');
    if (inputCompl && dados.complemento) {
      if (setReactInputValue(inputCompl, dados.complemento)) {
        preenchidos.push('Complemento');
      }
    }
    var inputTrat = document.querySelector('input[name="pronomeTratamento"]');
    if (inputTrat && dados.tratamento && !inputTrat.value) {
      setReactInputValue(inputTrat, dados.tratamento);
    }
    if (dados.processo) {
      expandirCamposProprietarios();
      setTimeout(function () {
        var inputProc = document.querySelector('input[name="campoproprietarioValor1"]');
        if (!inputProc) {
          var labels = document.querySelectorAll('.tabelaCamposProprietarios .campo label');
          for (var i = 0; i < labels.length; i++) {
            if ((labels[i].textContent || '').includes('Processo')) {
              var parentCampo = labels[i].closest('.campo');
              if (parentCampo) {
                inputProc = parentCampo.querySelector('input');
                break;
              }
            }
          }
        }
        if (inputProc) {
          if (setReactInputValue(inputProc, dados.processo)) {
            preenchidos.push('Processo');
          }
        }
      }, 50);
    }
    return preenchidos;
  }

  function showToast(msg, isSuccess) {
    var toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.style.cssText = [
      'position: fixed !important',
      'top: 20px !important',
      'left: 50% !important',
      'transform: translateX(-50%) !important',
      'z-index: 2147483647 !important',
      'background: ' + (isSuccess ? '#065f46' : '#991b1b') + ' !important',
      'color: #ffffff !important',
      'padding: 12px 24px !important',
      'border-radius: 10px !important',
      'box-shadow: 0 10px 25px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.2) !important',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
      'font-size: 14px !important',
      'font-weight: 600 !important',
      'display: flex !important',
      'align-items: center !important',
      'gap: 10px !important',
      'transition: opacity 300ms ease, transform 300ms ease !important',
      'pointer-events: none !important'
    ].join(';');
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-10px)';
      setTimeout(function () {
        if (toast.parentElement) toast.remove();
      }, 350);
    }, 3200);
  }

  function createHUD() {
    var hud = document.createElement('div');
    hud.id = HUD_ID;
    hud.style.cssText = [
      'position: fixed !important',
      'top: 20px !important',
      'right: 20px !important',
      'z-index: 2147483646 !important',
      'width: 380px !important',
      'background: #0f172a !important',
      'color: #f8fafc !important',
      'border: 2px solid #6366f1 !important',
      'border-radius: 16px !important',
      'box-shadow: 0 20px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.1) !important',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
      'font-size: 13px !important',
      'padding: 18px !important',
      'display: flex !important',
      'flex-direction: column !important',
      'gap: 12px !important',
      'backdrop-filter: blur(12px) !important',
      'box-sizing: border-box !important'
    ].join(';');

    var header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 10px; cursor: default;';
    var titleBox = document.createElement('div');
    titleBox.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    var iconSpan = document.createElement('span');
    iconSpan.style.fontSize = '18px';
    iconSpan.textContent = '⚡';
    var titleText = document.createElement('div');
    titleText.innerHTML = '<strong style="color: #818cf8; font-size: 14px;">Autopreencher & Extrator SMT</strong> <span style="font-size: 11px; color: #94a3b8; display: block;">4ª PJCrim • MPSP</span>';
    titleBox.appendChild(iconSpan);
    titleBox.appendChild(titleText);

    var btnClose = document.createElement('button');
    btnClose.textContent = '✕';
    btnClose.style.cssText = 'background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 16px; font-weight: bold; padding: 4px 8px; border-radius: 6px;';
    btnClose.onmouseover = function () { btnClose.style.color = '#fff'; btnClose.style.background = '#334155'; };
    btnClose.onmouseout = function () { btnClose.style.color = '#94a3b8'; btnClose.style.background = 'transparent'; };
    btnClose.onclick = function () { hud.remove(); };
    header.appendChild(titleBox);
    header.appendChild(btnClose);
    hud.appendChild(header);

    // Linha de ações rápidas: Extrair Dados do SMT e Colar do Clipboard
    var topActionsRow = document.createElement('div');
    topActionsRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';

    // NOVO BOTÃO: Extrair os Dados no SMT
    var btnExtractSMT = document.createElement('button');
    btnExtractSMT.style.cssText = [
      'background: #0284c7',
      'color: #ffffff',
      'border: none',
      'border-radius: 8px',
      'padding: 10px 10px',
      'font-weight: 700',
      'font-size: 12px',
      'cursor: pointer',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'gap: 6px',
      'box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4)',
      'transition: background 150ms ease'
    ].join(';');
    btnExtractSMT.innerHTML = '<span>📥</span> Extrair do SMT';
    btnExtractSMT.title = 'Captura os dados preenchidos no formulário do SMT para este painel e copia para o clipboard';
    btnExtractSMT.onmouseover = function () { btnExtractSMT.style.background = '#0369a1'; };
    btnExtractSMT.onmouseout = function () { btnExtractSMT.style.background = '#0284c7'; };

    var btnClipboard = document.createElement('button');
    btnClipboard.style.cssText = [
      'background: #4f46e5',
      'color: #ffffff',
      'border: none',
      'border-radius: 8px',
      'padding: 10px 10px',
      'font-weight: 700',
      'font-size: 12px',
      'cursor: pointer',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'gap: 6px',
      'box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4)',
      'transition: background 150ms ease'
    ].join(';');
    btnClipboard.innerHTML = '<span>📋</span> Colar & Preencher';
    btnClipboard.title = 'Lê do clipboard e preenche os campos do formulário SMT';
    btnClipboard.onmouseover = function () { btnClipboard.style.background = '#4338ca'; };
    btnClipboard.onmouseout = function () { btnClipboard.style.background = '#4f46e5'; };

    topActionsRow.appendChild(btnExtractSMT);
    topActionsRow.appendChild(btnClipboard);
    hud.appendChild(topActionsRow);

    var divider = document.createElement('div');
    divider.style.cssText = 'display: flex; align-items: center; text-align: center; color: #64748b; font-size: 11px; margin: 2px 0;';
    divider.innerHTML = '<div style="flex: 1; border-bottom: 1px solid #334155;"></div><span style="padding: 0 8px;">DADOS / QUALIFICAÇÃO</span><div style="flex: 1; border-bottom: 1px solid #334155;"></div>';
    hud.appendChild(divider);

    var textarea = document.createElement('textarea');
    textarea.placeholder = 'Texto extraído do SMT ou cole aqui os dados (Nome, CEP, nº, compl, processo)...';
    textarea.style.cssText = [
      'width: 100%',
      'height: 64px',
      'background: #1e293b',
      'border: 1px solid #475569',
      'border-radius: 8px',
      'color: #f1f5f9',
      'font-family: inherit',
      'font-size: 12px',
      'padding: 8px 10px',
      'box-sizing: border-box',
      'resize: vertical'
    ].join(';');
    hud.appendChild(textarea);

    var fieldsContainer = document.createElement('div');
    fieldsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

    function createInputRow(label, placeholder, key) {
      var row = document.createElement('div');
      row.style.cssText = 'display: flex; flex-direction: column; gap: 3px;';
      var lbl = document.createElement('label');
      lbl.style.cssText = 'font-size: 11px; font-weight: 600; color: #cbd5e1;';
      lbl.textContent = label;
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.dataset.field = key;
      inp.placeholder = placeholder;
      inp.style.cssText = [
        'background: #1e293b',
        'border: 1px solid #334155',
        'border-radius: 6px',
        'color: #f8fafc',
        'padding: 6px 10px',
        'font-size: 12px',
        'outline: none',
        'box-sizing: border-box',
        'width: 100%'
      ].join(';');
      inp.onfocus = function () { inp.style.borderColor = '#818cf8'; };
      inp.onblur = function () { inp.style.borderColor = '#334155'; };
      row.appendChild(lbl);
      row.appendChild(inp);
      return { row: row, input: inp };
    }

    var inpNome = createInputRow('👤 Nome Completo *', 'Ex: Francisco Tadeu Rezende Casella', 'nome');
    var inpCep = createInputRow('📮 CEP *', 'Ex: 01436-010', 'cep');
    var numComplRow = document.createElement('div');
    numComplRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
    var inpNum = createInputRow('🔢 Número *', 'Ex: 120', 'numero');
    var inpCompl = createInputRow('🏢 Complemento', 'Ex: Apto 32', 'complemento');
    numComplRow.appendChild(inpNum.row);
    numComplRow.appendChild(inpCompl.row);
    var inpProc = createInputRow('⚖️ Processo (Campos Proprietários)', 'Ex: 1519823-56.2025.8.26.0050', 'processo');

    fieldsContainer.appendChild(inpNome.row);
    fieldsContainer.appendChild(inpCep.row);
    fieldsContainer.appendChild(numComplRow);
    fieldsContainer.appendChild(inpProc.row);
    hud.appendChild(fieldsContainer);

    textarea.oninput = function () {
      var d = extrairDadosTexto(textarea.value);
      if (d.nome) inpNome.input.value = d.nome;
      if (d.cep) inpCep.input.value = d.cep;
      if (d.numero) inpNum.input.value = d.numero;
      if (d.complemento) inpCompl.input.value = d.complemento;
      if (d.processo) inpProc.input.value = d.processo;
    };

    var actionBox = document.createElement('div');
    actionBox.style.cssText = 'display: flex; gap: 8px; margin-top: 4px;';

    var btnSubmit = document.createElement('button');
    btnSubmit.style.cssText = [
      'flex: 2',
      'background: #059669',
      'color: #ffffff',
      'border: none',
      'border-radius: 8px',
      'padding: 10px',
      'font-weight: 700',
      'font-size: 13px',
      'cursor: pointer',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'gap: 6px',
      'box-shadow: 0 4px 12px rgba(5, 150, 105, 0.4)',
      'transition: background 150ms ease'
    ].join(';');
    btnSubmit.innerHTML = '<span>⚡</span> Preencher SMT';
    btnSubmit.onmouseover = function () { btnSubmit.style.background = '#047857'; };
    btnSubmit.onmouseout = function () { btnSubmit.style.background = '#059669'; };

    var btnCopy = document.createElement('button');
    btnCopy.style.cssText = [
      'flex: 1',
      'background: #334155',
      'color: #f1f5f9',
      'border: none',
      'border-radius: 8px',
      'padding: 10px',
      'font-weight: 600',
      'font-size: 12px',
      'cursor: pointer',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'gap: 4px'
    ].join(';');
    btnCopy.innerHTML = '<span>📋</span> Copiar';
    btnCopy.title = 'Copiar dados consolidados para a área de transferência';
    btnCopy.onclick = function () {
      var txt = textarea.value.trim();
      if (!txt) {
        var linhas = [];
        if (inpNome.input.value) linhas.push('Nome: ' + inpNome.input.value);
        if (inpProc.input.value) linhas.push('Processo: ' + inpProc.input.value);
        if (inpCep.input.value) linhas.push('CEP: ' + inpCep.input.value);
        if (inpNum.input.value) linhas.push('Número: ' + inpNum.input.value);
        if (inpCompl.input.value) linhas.push('Complemento: ' + inpCompl.input.value);
        txt = linhas.join('\\n');
      }
      if (txt && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () {
          showToast('✅ Dados copiados para o clipboard!', true);
        });
      } else {
        showToast('⚠️ Nada para copiar.', false);
      }
    };

    var btnClear = document.createElement('button');
    btnClear.style.cssText = [
      'flex: 1',
      'background: #1e293b',
      'color: #94a3b8',
      'border: 1px solid #334155',
      'border-radius: 8px',
      'padding: 10px',
      'font-weight: 600',
      'font-size: 12px',
      'cursor: pointer'
    ].join(';');
    btnClear.textContent = 'Limpar';
    btnClear.onclick = function () {
      textarea.value = '';
      inpNome.input.value = '';
      inpCep.input.value = '';
      inpNum.input.value = '';
      inpCompl.input.value = '';
      inpProc.input.value = '';
    };

    actionBox.appendChild(btnSubmit);
    actionBox.appendChild(btnCopy);
    actionBox.appendChild(btnClear);
    hud.appendChild(actionBox);

    // Executa extração de dados da tela do SMT
    function executarExtracaoSMT() {
      var d = extrairDadosDoFormularioSMT();
      var preenchidos = 0;
      if (d.nome) { inpNome.input.value = d.nome; preenchidos++; }
      if (d.cep) { inpCep.input.value = d.cep; preenchidos++; }
      if (d.numero) { inpNum.input.value = d.numero; preenchidos++; }
      if (d.complemento) { inpCompl.input.value = d.complemento; preenchidos++; }
      if (d.processo) { inpProc.input.value = d.processo; preenchidos++; }

      var linhasTexto = [];
      if (d.nome) linhasTexto.push('Nome: ' + d.nome);
      if (d.processo) linhasTexto.push('Processo: ' + d.processo);
      var end = [];
      if (d.logradouro) end.push(d.logradouro);
      if (d.numero) end.push('nº ' + d.numero);
      if (d.complemento) end.push(d.complemento);
      if (d.bairro) end.push('- ' + d.bairro);
      if (d.cidade) end.push(d.cidade + (d.uf ? '/' + d.uf : ''));
      if (end.length > 0) linhasTexto.push('Endereço: ' + end.join(', '));
      if (d.cep) linhasTexto.push('CEP: ' + d.cep);

      var resumo = linhasTexto.join('\\n');
      if (resumo) textarea.value = resumo;

      if (preenchidos > 0) {
        if (resumo && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(resumo).catch(function () {});
        }
        showToast('✅ ' + preenchidos + ' campo(s) extraído(s) do SMT e copiado(s)!', true);
      } else {
        showToast('⚠️ Nenhum campo preenchido encontrado no formulário SMT.', false);
      }
    }
    btnExtractSMT.onclick = executarExtracaoSMT;

    function executarPreenchimento() {
      var d = {
        nome: inpNome.input.value.trim(),
        cep: inpCep.input.value.trim(),
        numero: inpNum.input.value.trim(),
        complemento: inpCompl.input.value.trim(),
        processo: inpProc.input.value.trim()
      };
      if (!d.nome && !d.cep && textarea.value.trim()) {
        d = extrairDadosTexto(textarea.value.trim());
      }
      if (!d.nome && !d.cep && !d.numero && !d.processo) {
        showToast('⚠️ Preencha os campos ou cole um texto antes de aplicar!', false);
        return;
      }
      var preenchidos = aplicarNoFormularioSMT(d);
      if (preenchidos.length > 0) {
        showToast('✅ Sucesso! Campos preenchidos no SMT: ' + preenchidos.join(', '), true);
        setTimeout(function () {
          hud.remove();
        }, 800);
      } else {
        showToast('⚠️ Formulário SMT não encontrado na página atual.', false);
      }
    }
    btnSubmit.onclick = executarPreenchimento;

    btnClipboard.onclick = function () {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (clipText) {
          if (!clipText || !clipText.trim()) {
            showToast('⚠️ Área de transferência vazia!', false);
            return;
          }
          textarea.value = clipText;
          var d = extrairDadosTexto(clipText);
          inpNome.input.value = d.nome || '';
          inpCep.input.value = d.cep || '';
          inpNum.input.value = d.numero || '';
          inpCompl.input.value = d.complemento || '';
          inpProc.input.value = d.processo || '';
          var preenchidos = aplicarNoFormularioSMT(d);
          if (preenchidos.length > 0) {
            showToast('✅ Copiado do Clipboard e preenchido no SMT (' + preenchidos.length + ' campos)!', true);
            setTimeout(function () {
              hud.remove();
            }, 800);
          } else {
            showToast('📋 Dados extraídos! Verifique os campos e clique em Preencher.', true);
          }
        }).catch(function (err) {
          console.warn('Erro ao ler clipboard:', err);
          showToast('⚠️ Permissão de clipboard negada pelo navegador. Cole o texto na caixa!', false);
          textarea.focus();
        });
      } else {
        showToast('⚠️ Navegador não suporta leitura direta. Cole na caixa abaixo!', false);
        textarea.focus();
      }
    };

    hud.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        hud.remove();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.target.tagName === 'INPUT')) {
        e.preventDefault();
        executarPreenchimento();
      }
    });

    document.body.appendChild(hud);

    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (clipText) {
        if (clipText && clipText.trim() && (/\\d{5}-?\\d{3}/.test(clipText) || /\\d{7}-\\d{2}/.test(clipText))) {
          textarea.value = clipText;
          var d = extrairDadosTexto(clipText);
          if (d.nome) inpNome.input.value = d.nome;
          if (d.cep) inpCep.input.value = d.cep;
          if (d.numero) inpNum.input.value = d.numero;
          if (d.complemento) inpCompl.input.value = d.complemento;
          if (d.processo) inpProc.input.value = d.processo;
        }
      }).catch(function () {});
    }

    textarea.focus();
  }

  createHUD();
})();`;

// Código compilado e codificado pronto para uso como URL de favorito (javascript:...)
export const SMT_BOOKMARKLET_ENCODED = 'javascript:' + encodeURIComponent(
  SMT_BOOKMARKLET_SCRIPT.replace(/\\s+/g, ' ').trim()
);
