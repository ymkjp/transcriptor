/**
 * Transcriptor
*/
var APP_NAME = 'Transcriptor'
var GC_API_KEY = '__PASTE_YOUR_KEY_HERE__'
var LABEL_ENQ = '#GAS/transcriptor-enq'
var LABEL_DEQ = '#GAS/transcriptor-deq'
var RECIPIENT_ADDRESS = 'example+ml@gmail.com'
var REPLY_TO_ADDRESS = 'example+transcriptor@gmail.com'

/**
 * Specify the language used in target audio files
 * https://cloud.google.com/speech-to-text/docs/languages
 */
var LANG_CODE = 'en-US'
var CACHE_INVALIDATION = false

/**
 * Walk through the target emails
 * https://developers.google.com/apps-script/reference/gmail/
 */
// eslint-disable-next-line no-unused-vars
function main () {
  var targetLabel = GmailApp.getUserLabelByName(LABEL_ENQ)
  var notifiedLabel = GmailApp.getUserLabelByName(LABEL_DEQ)
  var threads = targetLabel.getThreads().reverse()

  for (var i in threads) {
    var thread = threads[i]
    var messages = thread.getMessages()
    var transcripts = []
    ensureEmailQuota()
    // TODO: Support dead letter queue and retry feature
    thread.removeLabel(targetLabel)
    for (var j in messages) {
      transcripts.push(transcribe(messages[j]).join('\n\n'))
    }
    var result = [
      transcripts.join('\n\n---\n\n'),
      thread.getPermalink(),
      ScriptApp.getService().getUrl()
    ]
    Logger.log(result)
    send(thread.getId(), result.join('\n\n'))
    thread.addLabel(notifiedLabel)
  }
  Logger.log('Done.')
}

/**
 * @param {GmailMessage} message
 * @returns {[String]} Transcripts
 */
function transcribe (message) {
  var attachments = message.getAttachments()
  var transcripts = []
  for (var i in attachments) {
    transcripts.push(recognize(attachments[i]))
  }
  transcripts.push(message.getPlainBody())
  return transcripts
}

/**
 * https://developers.google.com/apps-script/reference/cache/cache
 * @param {Blob} message
 * @returns {String} The most confident transcript
 */
function recognize (blob) {
  var cache = CacheService.getScriptCache()
  var audio = Utilities.base64EncodeWebSafe(blob.getBytes())
  var cacheKey = generateKey(audio)
  if (CACHE_INVALIDATION) {
    cache.removeAll([cacheKey])
  }
  var content = cache.get(cacheKey)
  if (content == null) {
    content = fetch(audio)
    cache.put(cacheKey, content, 6 * 60 * 60)
  }
  var res = JSON.parse(content)
  Logger.log(res)
  if (res.hasOwnProperty('results') && res['results'].length > 0 && res['results'][0]['alternatives'].length > 0) {
    return res['results'][0]['alternatives'][0]['transcript']
  }
  return '__NO_TRANSCRIPT__'
}

/**
 * https://cloud.google.com/speech-to-text/docs/basics
 * https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
 * @param {String} audio
 * @returns {String} content in JSON
 */
function fetch (audio) {
  var data = {
    'config': {
      'languageCode': LANG_CODE,
      'enableWordTimeOffsets': false
    },
    'audio': {
      'content': audio
    }
  }
  Logger.log(data)
  try {
    var response = UrlFetchApp.fetch('https://speech.googleapis.com/v1/speech:recognize?key=' + GC_API_KEY, {
      method: 'POST',
      contentType: 'application/json; charset=utf-8',
      payload: JSON.stringify(data)
    })
    Logger.log(response)
    return response.getContentText()
  } catch (e) {
    Logger.log(e.message)
    throw e
  }
}

/**
 * @param {String} target
 */
function generateKey (target) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, target))
}

/**
 * https://developers.google.com/apps-script/reference/mail/mail-app
 */
function ensureEmailQuota () {
  var quota = MailApp.getRemainingDailyQuota()
  Logger.log('Remaining email quota: ' + quota)
  if (quota <= 0) {
    throw new Error('Aborting script. Wait for the email quota on tomorrow.')
  }
}

/**
 * @param {String} subject
 * @param {String} body
 */
function send (subject, body) {
  MailApp.sendEmail({
    name: APP_NAME,
    replyTo: REPLY_TO_ADDRESS,
    to: RECIPIENT_ADDRESS,
    subject: ['[' + APP_NAME + ']', subject].join(' '),
    body: body
  })
}
