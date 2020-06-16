// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, Tray, ipcMain, shell} = require('electron')
const path = require('path')
const DownloadManager = require("electron-download-manager")
const axios = require('axios')
const proxy = require('https-proxy-agent')
const SnmpManager = require('net-snmp')
const Storage = require('./storage.js')
const Printers = require('./impressoras.js')
const storage = new Storage({ configName: 'settings', defaults: { versao: '0.1.0', dhcp: true }})
const dhcp = () => {
  var ip = require('my-local-ip')().split('.')
  return ip[0] + '.' + ip[1] + '.' + ip[2] + '.'
}
var icon
if(process.platform === "win32") {
  icon = "resources/icon.png"
} else {
  icon = "/etc/MundoEletronico/resources/icon.png"
}


if(process.platform === "win32") {
  DownloadManager.register({downloadFolder:'C:/Program Files/Mundo Eletronico/updates'})
} else {
  DownloadManager.register({downloadFolder:'/etc/MundoEletronico/updates'})
}

//status: atualizando, recebendo, dados
var status = null
var tray = null
var cliente = null
var tela = false
var webContents = null
var mainWindow = null

const createWindow = () => {
  // cria a janela principal
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: icon,
    maximizable: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true
    }
  })
  mainWindow.loadURL(`file://${__dirname}/index.html`)
  mainWindow.removeMenu()
  // abre o console
  //mainWindow.webContents.openDevTools()
  mainWindow.on('close', function (event) {
      if(!app.isQuiting){
          event.preventDefault()
          tela = false
          mainWindow.hide()
          criarTray()
      }
      return false
  })

  webContents = mainWindow.webContents
  switch (status) {
    case "atualizando":
      webContents.on('did-finish-load', function() {
        webContents.send('update')
      })
      break
    case "recebendo":
      webContents.on('did-finish-load', function() {
        webContents.send('load')
      })
      break
    case "dados":
      webContents.on('did-finish-load', function() {
        webContents.send('dados', dhcp())
      })
      break
    default:
      webContents.on('did-finish-load', function() {
        webContents.send('principal', cliente, app.getVersion())
      })
  }
  tela = true
}

// quando o app estiver pronto
app.on('ready', () => {
  criarTray()
  conferirDados()
})

/*
* listeners da tela
*/
ipcMain.on('gravarDados', (event, dados) => {
  gravarDados(dados)
})

ipcMain.on('atualizarDados', (event) => {
  conferirDados()
})

ipcMain.on('editarDados', (event) => {
  editarDados()
})

/*
/ minhas funções
*/
const criarTray = () => {
  tray = new Tray(icon)
  tray.setToolTip('Mundo Eletrônico')

  var contextMenu = Menu.buildFromTemplate([
    { label: 'Abrir', click:  function(){
      tray.destroy()
      createWindow()
    }}
  ])
  tray.setContextMenu(contextMenu)
}

const conferirDados = () => {

  status = "recebendo"
  var dados = new Object()
  dados.versao = app.getVersion()
  dados.id = storage.get('id')
  dados.local = storage.get('local')

  dados.proxy = storage.get('proxy')
  dados.user = storage.get('user')
  dados.pass = storage.get('pass')
  dados.host = storage.get('host')
  dados.port = storage.get('port')

  dados.dhcp = storage.get('dhcp')
  dados.ip = storage.get('ip')

  if(dados.proxy === undefined || dados.id === undefined || dados.dhcp === undefined) {
    pedirDados()
  } else {
    receberDados(dados)
  }
}

const pedirDados = () => {
  status = "dados"
  tray.destroy()
  createWindow()
}

const editarDados = () => {
  status = "dados"

  var dados = new Object()
  dados.id = storage.get('id')
  dados.local = storage.get('local')

  dados.proxy = storage.get('proxy')
  if(dados.proxy) {
    dados.user = storage.get('user')
    dados.pass = storage.get('pass')
    dados.host = storage.get('host')
    dados.port = storage.get('port')
  }

  dados.dhcp = storage.get('dhcp')
  if(!dados.dhcp) {
    dados.ip = storage.get('ip')
  } else {
    dados.ip = dhcp()
  }
  webContents.send('editarDados', dados)
}

const gravarDados = (dados) => {
  storage.set('id', dados.id)
  storage.set('local', dados.local)

  storage.set('proxy', dados.proxy)
  if(dados.proxy) {
    storage.set('user', dados.user)
    storage.set('pass', dados.pass)
    storage.set('host', dados.host)
    storage.set('port', dados.port)
  }

  storage.set('dhcp', dados.dhcp)
  if(!dados.dhcp) {
    storage.set('ip', dados.ip)
  }
  conferirDados()
}

const receberDados = (dados) => {
  if(dados.proxy) {
    var config = {
      url: 'https://us-central1-ioi-printers.cloudfunctions.net/dados',
      params: {
        plataforma: 'coletor',
        id: dados.id,
        versao: dados.versao,
        local: dados.local,
        sistema: process.platform
      },
      proxy: {
        host: dados.host,
        port: dados.port,
        auth: {
          username: dados.user,
          password: dados.pass
        }
      }
    }
    axios.request(config).then(res => {
      if(ret.data.ativo) {
        processarDados(res.data)
      }
    }).catch(err => {
      if(tela) {
        webContents.send('erro', "Verifique os dados do PROXY e se a ID está correta")
        webContents.send('removerLoad')
      } else {
        pedirDados()
      }
    })
  } else {
    var config = {
      url: 'https://us-central1-ioi-printers.cloudfunctions.net/dados',
      params: {
        plataforma: 'coletor',
        id: dados.id,
        versao: dados.versao,
        local: dados.local,
        sistema: process.platform
      }
    }
    axios.request(config).then(res => {
        processarDados(res.data)
    }).catch(err => {
      if(tela) {
        webContents.send('erro', "Verifique a conexão, se a rede usa PROXY e se a ID está correta")
        webContents.send('removerLoad')
      } else {
        pedirDados()
      }
    })
  }
}

const processarDados = (dados) => {

  if(dados.atualizar && process.platform === "win32") {
    atualizar(dados)
  } else if(dados.valid) {
    cliente = dados.cliente
    if(tela) {webContents.send('principal', cliente, app.getVersion())}
    buscarIps()
  } else {
    if(tela) {webContents.send('erro', "A ID do usário está ERRADA, verifique todos os números")}
  }
  if(tela && !dados.atualizar) {webContents.send('removerLoad')}
}

const atualizar = (dados) => {
  status = "atualizando"

  if(tela) { webContents.send('update') } else {
    tray.destroy()
    createWindow()
  }
  DownloadManager.download({
    url: dados.url
  }, function (error, info) {
    if (error) {
      if(tela) {webContents.send('erro', "Não foi possível baixar as atualizações, reinicando em 3 segundos")}
      setTimeout(() => {
        app.relaunch()
        app.exit(0)
      }, 3000)
      return
    } else {
      shell.openItem('C:/Program Files/Mundo Eletronico/updater.bat')
      app.exit(0)
    }
  })
}

const buscarIps = () => {

  status = null
  var ips = null
  if(!storage.get('dhcp')) {
    ips = storage.get('ip').split(";")
  } else {
    ips = dhcp().split(";")
  }
  for(var x = 0; x < ips.length; x++) {
    var ip = ips[x]
    for(var y = 1; y < 255; y++) {
      checarFabricante(ip + y)
    }
  }

  setTimeout(() => {
    conferirDados()
  }, 3600000)
}

const checarFabricante = (ip) => {
  const snmp = SnmpManager.createSession(ip, 'public')
  var oid = ["1.3.6.1.2.1.1.1.0"]
  snmp.get(oid, (error, res) => {
    if (!error) {
      var marca = res[0].value + ""
      if(!marca.toLowerCase().includes("switch")){
        selecionarModelo(marca, snmp, ip)
      } else {
        snmp.close()
      }
    } else {
      snmp.close()
    }
  })
}

const selecionarModelo = (fabricante, snmp, ip) => {
  var impressora = null
  var marca = marcaExiste(fabricante)
  if(marca != null) {
    if(marca == "aficio sp 3500") {
      impressora = new Printers.Aficio3500(snmp, ip)
    } else if(marca == "aficio sp 3510") {
      impressora = new Printers.Aficio3510(snmp, ip)
    } else if(marca == "brother") {
      impressora = new Printers.Brother(snmp, ip)
    } else if(marca == "canon") {
      impressora = new Printers.Canon(snmp, ip)
    } else if(marca == "epson") {
      impressora = new Printers.Epson(snmp, ip)
    } else if(marca == "hp") {
      impressora = new Printers.Hp(snmp, ip)
    } else if(marca == "lexmark") {
      impressora = new Printers.Lexmark(snmp, ip)
    } else if(marca == "oki") {
      impressora = new Printers.Oki(snmp, ip)
    } else if(marca == "samsung") {
      impressora = new Printers.Samsung(snmp, ip)
    }

    if(impressora != null) {
      impressora.pegarDados().then(res => {
        if(impressora.modelo != null && impressora.serial != null && impressora.leitura != null) {
          gravarImpressora(impressora, snmp)
        } else {
          snmp.close()
        }
      })
    } else {
      snmp.close()
    }
  } else {
    snmp.close()
  }
}

const marcaExiste = (fabricante) => {
  var marcas = ["aficio sp 3500", "aficio sp 3510", "brother", "canon", "epson", "hp", "lexmark", "oki", "samsung"]
  var res = null

  marcas.forEach(marca => {
    if(fabricante.toLowerCase().includes(marca) || fabricante.toLowerCase() == marca) {
      res = marca
      return
    }
  })
  return res
}

const gravarImpressora = (impressora, snmp) => {
  if(storage.get('proxy')) {
    var config = {
      url: 'https://us-central1-ioi-printers.cloudfunctions.net/gravarImpressora',
      params: {
        id: storage.get('id'),
        empresa: cliente.empresa,
        serial: impressora.serial,
        modelo: impressora.modelo,
        leitura: impressora.leitura,
        ip: impressora.ip
      },
      proxy: {
        host: dados.host,
        port: dados.port,
        auth: {
          username: dados.user,
          password: dados.pass
        }
      }
    }
    axios.request(config).then(res => {
      snmp.close()
      criarLayoutImpressora(impressora)
    }).catch(err => {
      if(tela) {webContents.send('erro', "Erro ao gravar impressora ", impressora.serial, ", ", impressora.modelo, ", ", impressora.ip, ", ", impressora.leitura)}
      snmp.close()
    })
  } else {
    var config = {
      url: 'https://us-central1-ioi-printers.cloudfunctions.net/gravarImpressora',
      params: {
        id: storage.get('id'),
        empresa: cliente.empresa,
        serial: impressora.serial,
        modelo: impressora.modelo,
        leitura: impressora.leitura,
        ip: impressora.ip
      }
    }
    axios.request(config).then(res => {
      snmp.close()
      criarLayoutImpressora(impressora)
    }).catch(err => {
      if(tela) {webContents.send('erro', "Erro ao gravar impressora ", impressora.serial, ", ", impressora.modelo, ", ", impressora.ip, ", ", impressora.leitura + " págs")}
      snmp.close()
    })
  }
}

const criarLayoutImpressora = (impressora) => {
  var data = new Date()
  var ano = data.getFullYear()
  var mes = data.getMonth() + 1;
  (mes < 10) ? mes = "0" + mes : 0;
  var dia = data.getDate();
  (dia < 10) ? dia = "0" + dia : 0;

  if(cliente.impressoras != undefined && cliente.impressoras[impressora.serial] !== undefined) {
    if(cliente.impressoras[impressora.serial].ativa) {
      //se a impressora existir e for ativa
      if(cliente.impressoras[impressora.serial].leituras[ano + "-" + mes] !== undefined) {
        //se já tiver o primeiro registro de leitura do mês
        cliente.impressoras[impressora.serial].leituras[ano + "-" + mes].final.valor = parseInt(impressora.leitura)
        cliente.impressoras[impressora.serial].leituras[ano + "-" + mes].final.dia = dia
      } else {
        //caso seja um mês novo
        cliente.impressoras[impressora.serial].leituras = {
          [ano + "-" + mes]: {
            inicial : {
              valor: impressora.leitura,
              dia: dia
            }, final : {
              valor: impressora.leitura,
              dia: dia
            }
          }
        }
      }
      //atualiza os niveis de tinta de acordo com a capacidade dele
      if(cliente.impressoras[impressora.serial].tinta.capacidade !== "ilimitado") {
        cliente.impressoras[impressora.serial].tinta = new Object()
        cliente.impressoras[impressora.serial].tinta.impresso = impressora.leitura - cliente.impressoras[impressora.serial].tinta.cheio
        cliente.impressoras[impressora.serial].tinta.nivel = parseInt(100 - ((100 * cliente.impressoras[impressora.serial].tinta.impresso) / cliente.impressoras[impressora.serial].tinta.capacidade))
      }
    }
  } else {
    cliente.impressoras = {
      [impressora.serial]: {
        franquia: 0,
        ip: impressora.ip,
        modelo: impressora.modelo,
        setor: "Não informado",
        ativa: true,
        tinta: {
          capacidade: "ilimitado",
          cheio: impressora.leitura,
          impresso: 0,
          nivel: 100
        }, leituras: {
          [ano + "-" + mes]: {
            inicial : {
              valor: impressora.leitura,
              dia: dia
            }, final : {
              valor: impressora.leitura,
              dia: dia
            }
          }
        }
      }
    }
  }
  if(tela) {webContents.send('principal', cliente, app.getVersion())}
}
