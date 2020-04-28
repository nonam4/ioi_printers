// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, Tray, ipcMain, shell} = require('electron')
const path = require('path')
const DownloadManager = require("electron-download-manager")
const axios = require('axios')
const proxy = require('https-proxy-agent')
const SnmpManager = require('net-snmp')
const Storage = require('./storage.js')
const Printers = require('./impressoras.js')

//require('electron-reload')(__dirname)
const storage = new Storage({ configName: 'settings', defaults: { versao: '0.1.0', dhcp: true }})
const dhcp = () => {
  var ip = require('my-local-ip')().split('.')
  return ip[0] + '.' + ip[1] + '.' + ip[2] + '.'
}

if(process.platform === "win32") {
  DownloadManager.register({downloadFolder:'C:/Program Files/Mundo Eletronico/updates'})
} else {
  DownloadManager.register({downloadFolder:'/lib/MundoEletronico/updates'})
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
    icon: 'resources/icon.ico',
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
  //storage.set('versao', "0.0.0")
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
  tray = new Tray('resources/icon.ico')
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
    storage.set('host', dados.hots)
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
      url: 'https://us-central1-ioi-printers.cloudfunctions.net/dados?plataforma=coletor&id=' + dados.id + '&versao=' + dados.versao + '&local=' + dados.local + '&sistema=' + process.platform,
      httpsAgent: new proxy('http://'+ dados.user + ':' + dados.pass + '@' + dados.host + ':' + dados.port)
    }
    axios.request(config).then(res => {
        processarDados(res.data)
    }).catch(err => {
      if(tela) {
        webContents.send('erro', "Verifique os dados do PROXY e se a ID está correta")
        webContents.send('removerLoad')
      } else {
        pedirDados()
      }
    })
  } else {
    axios.request('https://us-central1-ioi-printers.cloudfunctions.net/dados?plataforma=coletor&id=' + dados.id + '&versao=' + dados.versao + '&local=' + dados.local + '&sistema=' + process.platform).then(res => {
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
  if(dados.atualizar) {
    atualizar(dados)
  } else if(dados.valid) {
    cliente = dados.cliente
    if(tela) {webContents.send('principal', cliente, app.getVersion())}
    buscarIps()
  } else {
    if(tela) {webContents.send('erro', "A ID do usário está ERRADA, verifique todos os números")}
  }
  if(tela) {webContents.send('removerLoad')}
}

const atualizar = (dados) => {
  status = "atualizando"
  tray.destroy()
  if(!tela) {createWindow()} else {
    webContents.send('update')
  }

  if(storage.get('proxy')) {
    var config = {
      url: dados.url,
      httpsAgent: new proxy('http://'+ storage.get('user') + ':' + storage.get('pass') + '@' + storage.get('host') + ':' + storage.get('port'))
    }
    download(config, dados.versao)
  } else {
    download(dados.url, dados.versao)
  }
}

const download = (url, versao) => {
  console.log(url)
  DownloadManager.download({
    url: url
  }, function (error, info) {
    if (error) {
      if(tela) {webContents.send('erro', "Não foi possível baixar as atualizações, reinicando em 3 segundos")}
      setTimeout(() => {
        app.relaunch()
        app.exit(0)
      }, 3000)
      return
    } else {
      if(process.platform === "win32") {
        shell.openItem('C:/Program Files/Mundo Eletronico/updater.bat')
      } else {
        shell.openItem('/lib/MundoEletronico/updater.sh')
      }
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
      console.log("resposta do IP ", ip, " => ", marca)
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
        console.log("impressora definida => ", impressora.modelo, ", ", impressora.serial, ", ", impressora.leitura, ", ", impressora.ip)
        if(impressora.modelo != null && impressora.serial != null && impressora.leitura != null) {
          console.log("gravando impressora")
          gravarImpressora(impressora, snmp)
        } else {
          snmp.close()
        }
      })
    } else {
      console.log("impressora no ip ", ip, " nula")
      snmp.close()
    }
  } else {
    console.log("marca no ip ", ip, " nula")
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
      url: 'https://us-central1-ioi-printers.cloudfunctions.net/gravarImpressora?id=' + storage.get('id') + '&empresa=' + cliente.empresa + '&serial=' + impressora.serial + '&modelo=' + impressora.modelo + '&leitura=' + impressora.leitura + '&ip=' + impressora.ip,
      httpsAgent: new proxy('http://'+ storage.get('user') + ':' + storage.get('pass') + '@' + storage.get('host') + ':' + storage.get('port'))
    }
    axios.request(config).then(res => {
      snmp.close()
    }).catch(err => {
      console.log("erro ao gravar impressora ", impressora.serial, ", ", impressora.modelo, ", ", impressora.ip, ", ", impressora.leitura, " - stack => ", err)
      if(tela) {webContents.send('erro', "Erro ao gravar impressora ", impressora.serial, ", ", impressora.modelo, ", ", impressora.ip, ", ", impressora.leitura)}
      snmp.close()
    })
  } else {
    axios.request('https://us-central1-ioi-printers.cloudfunctions.net/gravarImpressora?id=' + storage.get('id') + '&empresa=' + cliente.empresa + '&serial=' + impressora.serial + '&modelo=' + impressora.modelo + '&leitura=' + impressora.leitura + '&ip=' + impressora.ip).then(res => {
      snmp.close()
    }).catch(err => {
      console.log("erro ao gravar impressora ", impressora.serial, ", ", impressora.modelo, ", ", impressora.ip, ", ", impressora.leitura, " - stack => ", err)
      if(tela) {webContents.send('erro', "Erro ao gravar impressora ", impressora.serial, ", ", impressora.modelo, ", ", impressora.ip, ", ", impressora.leitura)}
      snmp.close()
    })
  }
}
