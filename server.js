const express = require('express')
const app = express()
const mongoose = require('mongoose')
app.listen(3000)

mongoose.connect('mongodb://localhost:27017/test')
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err))

const Url = mongoose.model('Url', {original: String, short: String})

function generateShortCode(length = 4) {
  const randomPart = Math.random().toString(36).slice(2);
  return randomPart.padEnd(length, '0').slice(0, length);
}

function extractTLD(urlString) {
  try {
    const { hostname } = new URL(urlString);
    const parts = hostname.split('.');
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}



app.get('/', (request, response) => {
	response.send('Это сервис сокращения url');
})

app.get('/create', async (request, response) => {
    const url = request.query.url;
  if (!url) {
    return response.status(400).json({ error: 'Параметр url обязателен' });
  }

  const tld = extractTLD(url);
  if (!tld) {
    response.json({ original: url, created: false })
    return response.status(400).json({ error: 'Некорректный URL' });
    
  }
const inst = await Url.findOne({original: url})
  if(inst){
    response.json({ original: url, short: inst.short, created: null })
  }
  else{
    const code = generateShortCode();

    const shortUrl =`${code}.${tld}` 
    await Url.create({ original: url, short: shortUrl })

    response.json({ original: url, short: shortUrl, created: true })
  }

  
})



app.get('/refresh', async (request, response) =>{
  const url = request.query.url
  if (!url) {
    return response.status(400).json({ error: 'Параметр url обязателен' });
  }
  const inst = await Url.findOne({original: url})
  const tld = extractTLD(url)
  
  if(!tld){
    return response.json({original: url, refresh: false })
  }
  if(!inst){
    return response.json({ original: url, alias: null })
  }

  const code = generateShortCode();
  const shortUrl =`${code}.${tld}`
  const newUrl = await Url.findOneAndUpdate({original: url}, { $set: { short: shortUrl}}, { new: true})
  response.json({ original: url, short: shortUrl, refresh: true })
})

app.get('/alias', async (request, response) =>{
  const url = request.query.url
  if (!url) {
    return response.status(400).json({ error: 'Параметр url обязателен' });
  }
  const inst = await Url.findOne({original: url})
  const tld = extractTLD(url)
  
  if(!tld){
    return response.json({original: url, alias: false })
  }
  if(!inst){
    const code = generateShortCode();

    const shortUrl =`${code}.${tld}` 
    await Url.create({ original: url, short: shortUrl })

    return response.json({ original: url, short: shortUrl, created: true })
  }

  const code = generateShortCode();
  const shortUrl =`${code}.${tld}`
  const newUrl = await Url.create({original: url, short: shortUrl})
  response.json({ original: url, short: shortUrl, alias: true })
})

app.get('/remove', async (request, response) =>{
  const url = request.query.url
  if (!url) {
    return response.status(400).json({ error: 'Параметр url обязателен' });
  }
  const inst = await Url.findOne({original: url})
  const tld = extractTLD(url)
  
  if(!tld){
    return response.json({original: url, deleted: false })
  }
  if(!inst){
    return response.json({ original: url, deleted: null })
  }

  await Url.deleteMany({original: url})
  response.json({ original: url, deleted: true })
})

app.get('/:code', async (request, response) =>{
  const url = request.params.code
  const inst = await Url.findOne({short: url})
  if(!inst){
    return response.status(404).send('Ссылка не найдена')
  }
  response.redirect(inst.original)
})
