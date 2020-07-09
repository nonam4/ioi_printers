const fs = require('fs')

class Storage {
  constructor() {
    this.data = {}
  }

  init(callback) {
    const defaults = { proxy: false, dhcp: true }
    fs.readFile(settings(), "utf8", (err, data) => {
      if(err) {
        this.log('Erro ao ler dados no storage => ' + err)
        this.data = defaults
        callback()
      } else {
        this.data = JSON.parse(data)
        callback()
      }
    })
  }

  get(key) {
    return this.data[key]
  }

  set(val, callback) {
    this.data = val
    fs.writeFile(settings(), JSON.stringify(this.data), err => {
      if(err) {
        console.log(err)
      }
      callback()
    })
  }

  log(val) {
    var data = new Date()
    var name = data.getTime() + '.txt'
    fs.writeFile(logs() + name, String(val), err => {
      if(err) {
        console.log(err)
      }
    })
  }
}

const settings = () => {
  if(process.platform === "win32") {
    return 'C:/Program Files/Mundo Eletronico/settings.json'
  } else {
    return '/etc/MundoEletronico/settings.json'
  }
}

const logs = () => {
  if(process.platform === "win32") {
    return 'C:/Program Files/Mundo Eletronico/logs/'
  } else {
    return '/etc/MundoEletronico/logs/'
  }
}

// expose the class
module.exports = Storage
