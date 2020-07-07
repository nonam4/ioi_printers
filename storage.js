const fs = require('fs')

class Storage {
  constructor() {}

  async init(callback) {
    const defaults = { proxy: false, dhcp: true }
    this.data = await getData(path(), defaults)
    callback.bind(this)()
  }

  get(key) {
    return this.data[key]
  }

  set(key, val) {
    this.data[key] = val
    fs.writeFile(path(), JSON.stringify(this.data), (err) => {
      if(err) {
        console.log(err)
      }
    })
  }
}

const path = () => {
  if(process.platform === "win32") {
    return "C:/Program Files/Mundo Eletronico/settings.json"
  } else {
    return "/etc/MundoEletronico/settings.json"
  }
}

const getData = (path, defaults) => {
  return new Promise(resolve => {
    fs.readFile(path, "utf8", (err, data) => {
      console.log(data)
      if(err) {
        console.log(err)
        resolve(defaults)
      } else {
        resolve(JSON.parse(data))
      }
    })
  })
}

// expose the class
module.exports = Storage
