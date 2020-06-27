const renderer = require('electron').ipcRenderer

renderer.on('dados', (event, ip) => {
  criarDados(ip)
})

renderer.on('editarDados', (event, dados) => {
  editarDados(dados)
})

renderer.on('update', event => {
  criarUpdate()
})

renderer.on('load', event => {
  criarLoad()
})

renderer.on('removerLoad', event => {
  removerLoad()
})

renderer.on('principal', (event, dados, version) => {
  criarPrincipal(dados, version)
})

renderer.on('recriarPrincipal', (event, dados) => {
  recriarPrincipal(dados)
})

renderer.on('erro', (event, mensagem) => {
  criarErro(mensagem)
})

renderer.on('log', (event, mensagem) => {
  console.log(mensagem)
})

/*
* erros
*/
const criarErro = mensagem => {
  var erro = document.getElementById("error")
  erro.innerHTML = mensagem
  erro.style.bottom = "0px"

  setTimeout(() => {
    erro.style.bottom = "-100px"
  }, 4000)
}

/*
* tela de dados
*/
const criarDados = ip => {
  document.getElementById('body').innerHTML = ""
  var dado = document.getElementById("tdados").content.cloneNode(true)
  document.getElementById("body").appendChild(dado)
  document.getElementById("dhcpip").value = ip
  document.getElementById("host").value = ip + "254"
  funcoesDados()
}

const editarDados = arg => {
  document.getElementById('body').innerHTML = ""
  criarLoad()
  var dados = document.getElementById("tdados").content.cloneNode(true)
  document.getElementById("body").appendChild(dados)
  document.getElementById("dhcpip").value = arg.ip
  document.getElementById("host").value = arg.ip + "254"

  document.getElementById("id").value = arg.id
  document.getElementById("local").value = atob(arg.local)

  if(arg.proxy) {
    document.getElementById('proxytrue').checked = true
    document.getElementById('host').value = arg.host
    document.getElementById('port').value = arg.port
    document.getElementById('user').value = arg.user
    document.getElementById('pass').value = arg.pass
  }

  if(arg.dhcp) {
    document.getElementById('dhcptrue').checked = true
  } else {
    document.getElementById('dhcpfalse').checked = true
  }
  funcoesDados()
  setTimeout(() => {
    removerLoad()
  }, 1000)
}

const funcoesDados = () => {

  var salvar = document.getElementById('salvar')
  salvar.addEventListener('click', () => {

    var dados = new Object()
    dados.id = document.getElementById('id').value
    dados.local = btoa(document.getElementById('local').value)

    dados.proxy = false
    if(document.getElementById('proxytrue').checked){
      dados.proxy = true
      dados.host = document.getElementById('host').value
      dados.port = document.getElementById('port').value
      dados.user = document.getElementById('user').value
      dados.pass = document.getElementById('pass').value
    }

    dados.dhcp = true
    if(document.getElementById('dhcpfalse').checked){
      dados.dhcp = false
      dados.ip = document.getElementById('dhcpip').value
    }

    if(document.getElementById('id').value.length < 13) {
      criarErro("A ID do cliente está faltando alguns números")
    } else if(document.getElementById('local').value.length < 4) {
      criarErro("A identificação do local de instalação do aplicativo é muito curta ou vazia")
    } else if(document.getElementById('proxytrue').checked && document.getElementById('user').value.length <= 0 ||
              document.getElementById('proxytrue').checked && document.getElementById('pass').value.length <= 0 ||
              document.getElementById('proxytrue').checked && document.getElementById('host').value.length <= 0 ||
              document.getElementById('proxytrue').checked && document.getElementById('port').value.length <= 0) {
      criarErro("Os dados do proxy não podem estar vazios")
    } else if(document.getElementById('host').value.match(/\./g) == null ||
              document.getElementById('host').value.match(/\./g).length != 3 &&
              document.getElementById('proxytrue').checked) {
      criarErro("O endereço do proxy deve seguir o exemplo a seguir: '000.000.000.000'")
    } else if(conferirIps() && document.getElementById('dhcpfalse').checked) {
      criarErro("Os endereços de IP devem seguir o exemplo a seguir: '000.000.000.'")
    } else {
      criarLoad()
      renderer.send('gravarDados', dados)
    }
  })
}

const conferirIps = () => {
  var ips = document.getElementById('dhcpip').value.split(";")
  var mostrarerro = false
  for(var x = 0; x < ips.length; x++) {
    var ip = ips[x]
    if(ip.match(/\./g) == null || ip.match(/\./g).length != 3) {
      mostrarerro = true
      break
    }
  }
  return mostrarerro
}

/*
* loads
*/
const criarUpdate = () => {
  var load = document.getElementById("tload").content.cloneNode(true)
  load.querySelector("#loadstatus").innerHTML = "Estamos preparando as atualizações... <br> Algumas telas irão aparecer, aguarde um pouquinho pois elas vão fechar automaticamente"
  document.getElementById("body").appendChild(load)
}

const criarLoad = () => {
  var load = document.getElementById("tload").content.cloneNode(true)
  load.querySelector("#loadstatus").innerHTML = "Estamos preparando dados, por favor aguarde..."
  document.getElementById("body").appendChild(load)
}

const removerLoad = () => {
  var load = document.getElementsByTagName("load")
  for(let div of load) {
      div.style.opacity = 0
  }
  setTimeout(() => {
    for(let div of load) {
      document.getElementById("body").removeChild(div)
    }
  }, 250)
}

/*
* principal
*/
const criarPrincipal = (dados, version) => {
  document.getElementById('body').innerHTML = ""
  criarLoad()
  var principal = document.getElementById("tprincipal").content.cloneNode(true)
  document.getElementById("body").appendChild(principal)
  preencherPrincipal(dados, version)
  funcoesPrincipal()
  setTimeout(() => {
    removerLoad()
  }, 1000)
}

const preencherPrincipal = (dados, version) => {
  var data = new Date()
  var ano = data.getFullYear()
  var mes = data.getMonth() + 1
  if (mes < 10) { mes = "0" + mes }
  var meses = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

  document.body.querySelector("#rodape").innerHTML = document.body.querySelector("#rodape").innerHTML + version

  document.body.querySelector("#nome").innerHTML = dados.nomefantasia
  if(dados.endereco.complemento != "" & dados.endereco.complemento != undefined) {
    document.body.querySelector("#rnc").innerHTML = dados.endereco.rua + ", " + dados.endereco.numero + ", " + dados.endereco.complemento
  } else {
    document.body.querySelector("#rnc").innerHTML = dados.endereco.rua + ", " + dados.endereco.numero
  }
  document.body.querySelector("#ce").innerHTML = dados.endereco.cidade + ", " + dados.endereco.estado
  document.body.querySelector("#chave").innerHTML = dados.id

  gerarDatasDeListagem(dados)
  var datas = document.getElementById("dadosmes")
  var listagem = datas.options[datas.selectedIndex].value

  if(dados.franquia.valor == undefined || dados.franquia.valor == null) {
    dados.franquia.valor = 0
  }

  dados.impresso = 0
  var impressoras = dados.impressoras

  if(impressoras != undefined && impressoras != null) {
    for(var x = 0; x < Object.keys(impressoras).length; x++) {
      var impressora = impressoras[Object.keys(impressoras)[x]]
      if(impressora.ativa) {
        /*
        * define a franquia total do cliente se a franquia for separada por maquinas
        */
        if(dados.franquia.tipo !== "ilimitado" && dados.franquia.tipo !== "pagina") {

          dados.franquia.valor = parseInt(dados.franquia.valor) + parseInt(impressora.franquia)
        }
        /*
        * define o total impresso por todas as maquinas
        */
        if(impressora.leituras[listagem] !== undefined) {
          var inicio = impressora.leituras[listagem].inicial.valor
          var fim = impressora.leituras[listagem].final.valor
          dados.impresso = dados.impresso + (fim - inicio)
        }

        /*
        * cria a interface
        */
        var layout = document.getElementById("timpressora").content.cloneNode(true)
        layout.querySelector("impressora").id = Object.keys(impressoras)[x]
        layout.querySelector("#impressoramodelo").innerHTML = impressora.modelo
        layout.querySelector("#impressorasetor").innerHTML = impressora.setor
        layout.querySelector("#impressoraserial").innerHTML = Object.keys(impressoras)[x]
        layout.querySelector("#impressoraip").innerHTML = impressora.ip
        if(impressora.tinta.capacidade != "ilimitado") {
          layout.querySelector("#impressoratinta").innerHTML = impressora.tinta.nivel + "%"
        } else {
          layout.querySelector("#impressoratinta").innerHTML = "∞"
        }

        if(dados.franquia.tipo != "ilimitado" && dados.franquia.tipo != "pagina") {
            layout.querySelector("#impressorafranquia").innerHTML = impressora.franquia + " págs"
        } else {
          layout.querySelector("#impressorafranquia").innerHTML = "S/F"
        }
        if(impressora.leituras[listagem] !== undefined) {
          layout.querySelector("#impressoraimpresso").innerHTML = impressora.leituras[listagem].final.valor - impressora.leituras[listagem].inicial.valor + " págs"
          layout.querySelector("#impressorainicial").innerHTML = impressora.leituras[listagem].inicial.dia + "/" + mes + "/" + ano + " - " + impressora.leituras[listagem].inicial.valor + " págs"
          layout.querySelector("#impressorafinal").innerHTML = impressora.leituras[listagem].final.dia + "/" + mes + "/" + ano + " - " + impressora.leituras[listagem].final.valor + " págs"
        } else {
          layout.querySelector("#impressoraimpresso").innerHTML = "0 págs"
          layout.querySelector("#impressorainicial").innerHTML = "Sem registro"
          layout.querySelector("#impressorafinal").innerHTML = "Sem registro"
        }

        if(dados.franquia.tipo == "ilimitado" || dados.franquia.tipo == "pagina") {
          layout.querySelector("#impressoraexcedentes").innerHTML = "S/F"
        } else if(dados.franquia.tipo == "maquina" && impressora.leituras[listagem] !== undefined) {
          var impresso = impressora.leituras[listagem].final.valor - impressora.leituras[listagem].inicial.valor
          if(impresso > impressora.franquia) {
              layout.querySelector("#impressoraexcedentes").innerHTML = impresso - impressora.franquia + " págs"
          } else {
              layout.querySelector("#impressoraexcedentes").innerHTML = "0 págs"
          }
        } else {
          layout.querySelector("#impressoraexcedentes").innerHTML = "0 págs"
        }
        document.getElementById("impressoras").appendChild(layout)
      }
    }
  }

  if(dados.franquia.tipo !== "ilimitado") {
    if(dados.franquia.valor < dados.impresso) {
    dados.excedentes = dados.impresso - dados.franquia.valor
    } else {
      dados.excedentes = 0
    }
    document.body.querySelector("#dadosfranquia").innerHTML = dados.franquia.valor + " págs"
    document.body.querySelector("#dadosimpresso").innerHTML = dados.impresso + " págs"
    document.body.querySelector("#dadosexcedente").innerHTML = dados.excedentes + " págs"
  } else {
    dados.excedentes = "S/F"
    dados.franquia.valor = "S/F"

    document.body.querySelector("#dadosfranquia").innerHTML = dados.franquia.valor
    document.body.querySelector("#dadosimpresso").innerHTML = dados.impresso + " págs"
    document.body.querySelector("#dadosexcedente").innerHTML = dados.excedentes
  }
}

const gerarDatasDeListagem = cliente => {

  var dataAtual = new Date()
  var ano = dataAtual.getFullYear()
  var mes = dataAtual.getMonth() + 1
  if (mes < 10) { mes = "0" + mes }

  var datas = document.getElementById("dadosmes")
  datas.addEventListener("change", () => {alterarDatas(cliente)})
  datas
  datas.innerHTML = ""
	//preenche os meses disponiveis
	for(var x = 0; x < 3; x++){
    var data = document.createElement("option")
    data.value = ano + "-" + mes
    data.innerHTML = mes + "/" + ano
    datas.appendChild(data)

		if(mes <= 1){
			mes = 12
			ano = ano - 1
		} else {
			mes = mes - 1
      if(mes < 10) { mes = "0" + mes }
		}
	}
}

const funcoesPrincipal = () => {
  var atualizar = document.getElementById('atualizar')
  atualizar.addEventListener('click', () => {
    criarLoad()
    renderer.send('atualizarDados')
  })
  var settings = document.getElementById('settings')
  settings.addEventListener('click', () => {
    renderer.send('editarDados')
  })
}

const alterarDatas = cliente => {
  criarLoad()
  preencherImpressoras(cliente)
  setTimeout(() => {
    removerLoad()
  }, 1000)
}

const preencherImpressoras = dados => {
  document.getElementById("impressoras").innerHTML = ""

  var datas = document.getElementById("dadosmes")
  var listagem = datas.options[datas.selectedIndex].value
  dados.impresso = 0
  var impressoras = dados.impressoras

  for(var x = 0; x < Object.keys(impressoras).length; x++) {
    var impressora = impressoras[Object.keys(impressoras)[x]]
    if(impressora.ativa) {
      /*
      * define o total impresso por todas as maquinas
      */
      if(impressora.leituras[listagem] !== undefined) {
        var inicio = impressora.leituras[listagem].inicial.valor
        var fim = impressora.leituras[listagem].final.valor
        dados.impresso = dados.impresso + (fim - inicio)
      }

      /*
      * cria a interface
      */
      var layout = document.getElementById("timpressora").content.cloneNode(true)
      layout.querySelector("impressora").id = Object.keys(impressoras)[x]
      layout.querySelector("#impressoramodelo").innerHTML = impressora.modelo
      layout.querySelector("#impressorasetor").innerHTML = impressora.setor
      layout.querySelector("#impressoraserial").innerHTML = Object.keys(impressoras)[x]
      layout.querySelector("#impressoraip").innerHTML = impressora.ip
      if(impressora.tinta.capacidade != "ilimitado") {
        layout.querySelector("#impressoratinta").innerHTML = impressora.tinta.nivel + "%"
      } else {
        layout.querySelector("#impressoratinta").innerHTML = "∞"
      }

      if(dados.franquia.tipo != "ilimitado" && dados.franquia.tipo != "pagina") {
          layout.querySelector("#impressorafranquia").innerHTML = impressora.franquia + " págs"
      } else {
        layout.querySelector("#impressorafranquia").innerHTML = "S/F"
      }
      var split = listagem.split('-')
      if(impressora.leituras[listagem] !== undefined) {
        layout.querySelector("#impressoraimpresso").innerHTML = impressora.leituras[listagem].final.valor - impressora.leituras[listagem].inicial.valor + " págs"
        layout.querySelector("#impressorainicial").innerHTML = impressora.leituras[listagem].inicial.dia + "/" + split[1] + "/" + split[0] + " - " + impressora.leituras[listagem].inicial.valor + " págs"
        layout.querySelector("#impressorafinal").innerHTML = impressora.leituras[listagem].final.dia + "/" + split[1] + "/" + split[0] + " - " + impressora.leituras[listagem].final.valor + " págs"
      } else {
        layout.querySelector("#impressoraimpresso").innerHTML = "0 págs"
        layout.querySelector("#impressorainicial").innerHTML = "Sem registro"
        layout.querySelector("#impressorafinal").innerHTML = "Sem registro"
      }

      if(dados.franquia.tipo == "ilimitado" || dados.franquia.tipo == "pagina") {
        layout.querySelector("#impressoraexcedentes").innerHTML = "S/F"
      } else if(dados.franquia.tipo == "maquina") {
        var impresso = 0

        if(impressora.leituras[listagem] !== undefined) {
           impresso = impressora.leituras[listagem].final.valor - impressora.leituras[listagem].inicial.valor
        }
        if(impresso > impressora.franquia) {
            layout.querySelector("#impressoraexcedentes").innerHTML = impresso - impressora.franquia + " págs"
        } else {
            layout.querySelector("#impressoraexcedentes").innerHTML = "0 págs"
        }
      }
      document.getElementById("impressoras").appendChild(layout)
    }
  }

  if(dados.franquia.tipo !== "ilimitado") {
    if(dados.franquia.valor < dados.impresso) {
    dados.excedentes = dados.impresso - dados.franquia.valor
    } else {
      dados.excedentes = 0
    }
  } else {
    dados.excedentes = "S/F"
    dados.franquia.valor = "S/F"
  }

  document.body.querySelector("#dadosfranquia").innerHTML = dados.franquia.valor + " págs"
  document.body.querySelector("#dadosimpresso").innerHTML = dados.impresso + " págs"
  document.body.querySelector("#dadosexcedente").innerHTML = dados.excedentes + " págs"
}
