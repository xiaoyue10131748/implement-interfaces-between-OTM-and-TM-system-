// URL: /handler/scmp

// 物流商接口标示码
var SCMP_ID_CONFIG = {
  'R302_INTERFACE': 'A7#A8CE0$53010',
  'R305_INTERFACE': 'F21B!85$D7A8CE'
}
common.SCMP_ID_CONFIG = SCMP_ID_CONFIG
// 物流商支持的接口版本
var SCMP_VERSION = '1.0'
// 接口名称到方法的映射对象
var SCMP_INBOUNDS = {}
common.SCMP_INBOUNDS = SCMP_INBOUNDS
var SCMP_OUTBOUNDS = {}
common.SCMP_OUTBOUNDS = SCMP_OUTBOUNDS


// 后续各接口使用的通用变量集合
common.SCMP_ENV = {
  DEBUG: false,
  SCMP_URL: 'https://scmp-tmstest.dongfeng-nissan.com.cn/MainService.asmx/RequestHandler', // 测试环境指向本地URL，后期可以配置到首选项
  OTM_URL: 'http://120.77.244.190:7778/GC3/glog.integration.servlet.WMServlet',
  OTM_DOMAIN: 'NCS'
}

common.scmpPostXML = function(url, data) {
  return common.httpRequest.post(url).bodyText(data, 'text/xml', 'UTF-8').send()
}

common.scmpPostJSON = function(url, data) {
  return common.httpRequest.post(url).bodyText(data, 'application/json', 'UTF-8').trustAllCerts(true).verifyHttpsHost(false).send()
}

function extractTransmissionNo(xml) {
  var beginTag = '<ReferenceTransmissionNo>'
  var endTag = '</ReferenceTransmissionNo>'
  var begin = xml.indexOf(beginTag)
  if (begin !== -1) {
    return xml.substring(begin + beginTag.length, xml.indexOf(endTag))
  } else {
    return 'NO_TRANSMISSION'
  }
}

common.scmpCallOTM = function($, templatePath, templateModel) {
  var template = common.loadFreemarker($, templatePath)
  var otmXml = common.freemarker.render(templatePath, template, templateModel)
   print("======================otmXml= " + otmXml)
  // Post to OTM inbound
  var url = $.getStringPreference('nsc.otm.url', common.SCMP_ENV.OTM_URL)
  var httpResponse = common.scmpPostXML(url, otmXml)
  if (httpResponse.statusCode() === 200) {
    var resp = httpResponse.bodyText()
    print('OTM RESPONSE:')
    print(resp)
    return extractTransmissionNo(resp)
  } else {
    return 'HTTP ' + httpResponse.statusCode()
  }
}

// 修正29小时格式时间并转换成OTM需要的时间文本格式
function decodeTime(time) {
  var dt = time.split(' ')
  var hm = dt[1].split(':')
  var h = parseInt(hm[0])
  var result = null
  if (h > 23) {
    var date = common.parseDateTime(dt[0] + ' 00:00', 'yyyy-MM-dd HH:mm')
    date = date.plusDays(1)
    date = date.withHour(h - 24)
    date = date.withMinute(parseInt(hm[1]))
    result = date
  } else {
    result = common.parseDateTime(time, 'yyyy-MM-dd HH:mm')
  }
  return common.formatDateTime(result, 'yyyyMMddHHmmss')
}
common.scmpDecodeTime = decodeTime


function decodeTimeField(map, fieldName) {
  var val = map.get(fieldName)
  if (val) {
    map.put(fieldName, decodeTime(val))
  }
}
common.scmpDecodeTimeField = decodeTimeField


// 使用`sql`和`args`查询数据库，并将返回值设置到`map`的`field`字段
function queryValue($, map, field, sql, args) {
  try {
    var result = $.queryService.jdbcTemplate.queryForMap(sql, args)
    map.put(field, result.get(field))
  } catch (e) {
    throw new java.lang.RuntimeException('Field to query "' + field + '" by [' + args.join(',') + ']',
      common.throwable(e))
  }
}
common.scmpQueryValue = queryValue


function jsonObjectToMap(node) {
  var it = node.fields()
  var map = common.hashMap()
  while (it.hasNext()) {
    var entry = it.next()
    var name = entry.key
    var value = entry.value
    if (value.isValueNode()) {
      if (value.isNull()) {
        value = null
      } else if (value.isInt()) {
        value = value.intValue()
      } else if (value.isLong()) {
        value = value.longValue()
      } else if (value.isFloat()) {
        value = value.floatValue()
      } else if (value.isBoolean()) {
        value = value.booleanValue()
      } else {
        value = value.asText()
      }
    } else if (value.isNull()) {
      value = null
    }
    map.put(name, value)
  }
  return map
}
common.scmpJsonObjectToMap = jsonObjectToMap


function sign(secret, content, timestamp) {
  var text = content + secret + (content ? content.length : 0) + timestamp
  var hashed = common.hashing.md5().hashString(text, common.charsets.UTF_8).toString()
  return hashed.toUpperCase()
}


function createResponse(msgHeader, msgBody, status, content) {
  if (!content) content = ''
  var secret = SCMP_ID_CONFIG[msgHeader.get('ID_CODE').asText()]
  var json = common.hashMap()
  json.put('STATUS_CODE', status)
  json.put('TYPE_CODE', msgHeader.get('TYPE_CODE').asText())
  json.put('REQUEST_TIME', msgBody.get('TIMESTAMP').asText())
  json.put('CONTENT', content)
  json.put('LENGTH', '' + content.length)
  json.put('TIMESTAMP', common.formatDateTime(common.now(), 'yyyyMMddHHmmss'))
  json.put('SIGN', sign(secret, content, json.get('TIMESTAMP')))
  return json
}
common.scmpCreateResponse = createResponse


// 如果请求数据有错误，返回一个错误的响应JSON
function checkRequest(msgHeader, msgBody) {
  var secret = ''
  if (!(msgHeader.hasNonNull('ID_CODE') &&
      SCMP_ID_CONFIG[msgHeader.get('ID_CODE').asText()])) {
    return createResponse(msgHeader, msgBody, '1')
  }
  secret = SCMP_ID_CONFIG[msgHeader.get('ID_CODE').asText()]
  if (!msgHeader.hasNonNull('TYPE_CODE')) {
    return createResponse(msgHeader, msgBody, '2')
  }
  if (!(msgHeader.hasNonNull('VERSION') &&
      msgHeader.get('VERSION').asText() === SCMP_VERSION)) {
    return createResponse(msgHeader, msgBody, '3')
  }

  if (!common.SCMP_ENV.DEBUG) {
    // print("============ msgBody" + msgBody)
    if (!(msgBody.hasNonNull('CONTENT') &&
        msgBody.get('CONTENT').asText().length > 0)) {
      return createResponse(msgHeader, msgBody, '5')
    }
    if (!common.SCMP_ENV.DEBUG) {
      // 调试环境不检查签名，因为CONTENT直接是JSON对象，不是JSON文本，为了方便测试
      if (!(msgBody.hasNonNull('SIGN') &&
          msgBody.hasNonNull('TIMESTAMP') &&
          msgBody.get('SIGN').asText() === sign(secret, msgBody.get('CONTENT').asText(), msgBody.get('TIMESTAMP').asText()))) {
        return createResponse(msgHeader, msgBody, '6')
      }
    }
  }
  return null
}


function createMsgForException(e) {
  var msg = e.getMessage() + '[' + e.getClass() + ']'
  while (e.getCause()) {
    e = e.getCause()
    msg = msg + '\r\n' + e.getMessage() + '[' + e.getClass() + ']'
  }
  return msg
}


// HTTP Handler 用来处理导入的请求
// 导入接口的起点在这里


httpHandlers.scmp = {
  post: function($, httpRequest, httpResponse) {
    var msgHeader, msgBody, respJson, typeCode, interface, contentObj, log
    // 设置响应Content-Type
    httpResponse.addHeader('Content-Type', 'application/json')

    // 根据HTTP Content-Type的不同获取MSG_HEADER和MSG_BODY
    //  var msgHeader, msgBody
    var contentType = httpRequest.getHeader('Content-Type').toLowerCase().split(';')[0]
    // print("=============Content-Type=", contentType)
    if (contentType === 'application/json') {
      common.SCMP_ENV.DEBUG = ('true' == httpRequest.getHeader('X-Debug'))
      // 解析请求的JSON，并获取HEADER和BODY
      var reqJsonStr = common.streamUtils.copyToString(httpRequest.getInputStream(), common.charsets.UTF_8)
       print(reqJsonStr)
      print("=============reqJsonStr=  " + reqJsonStr)
      var reqJson = common.fromJson(reqJsonStr)
      msgHeader = reqJson.get('MSG_HEADER')
      msgBody = reqJson.get('MSG_BODY')

      if (!common.SCMP_ENV.DEBUG) {
        msgHeader = common.fromJson(msgHeader.asText())
        msgBody = common.fromJson(msgBody.asText())
      }
    } else {
      httpResponse.setStatus(400) // bad request
      print('Failed check application/json', contentType)
      return
    }

    if (!(msgHeader && msgHeader.isObject() && msgBody && msgBody.isObject())) {
      httpResponse.setStatus(400) // bad request
      print('Failed check msgHeader & msgBody', msgHeader, msgBody)
      return
    }

    // 检查MSG_HEADER, MSG_BODY
    respJson = checkRequest(msgHeader, msgBody)
    if (respJson) {
      httpResponse.writer.println(common.toJson(respJson))
      return
    }

    typeCode = msgHeader.get('TYPE_CODE').asText()
    //  contentObj = null
    // if (common.SCMP_ENV.DEBUG) {
    //   // 调试环境直接取CONTENT对象
    //   contentObj = msgBody.get('CONTENT')
    // } else {
    //   // 生产环境需要取出CONTENT文本后转成JSON对象或数组
    //   contentObj = common.fromJson(msgBody.get('CONTENT').asText())
    // }

    //  interface = SCMP_INBOUNDS[typeCode]
    try {
      var logid = $.doInNewTransaction(function() {
        var log = common.hashMap(
          'type', typeCode,
          'direction', '01',
          'id_code', msgHeader.get('ID_CODE').asText(),
          'msg_header', common.toJson(msgHeader),
          'msg_body', common.toJson(msgBody),
          'status', '01',
          'transmission', '',
          'transmission1', '',
          'rmk', '')
        // print("=============test1")
        $.queryService.insert('scmp_api_log', log)
        // print("=============test2" + log.id)
        return log.id
      })
    } catch (e) {
      respJson = createResponse(msgHeader, msgBody, 'Z')
    }


    var args = logid

    var ctx = $.newTaskContext('inboundTask')
    $.task(ctx, common.objectArray(args))

respJson = createResponse(msgHeader, msgBody, '0','OK')
    print("=========respJsonxx"+respJson)
    var respJsonStr = common.toJson(respJson)
    httpResponse.writer.println(respJsonStr)
print("=========respJsonyy"+respJsonStr)

    // if (interface) {
    //   try {
    //     respJson = interface($, msgHeader, msgBody, contentObj, log)
    //   } catch (e) {
    //     e = common.throwable(e)
    //     common.getLogger('scmp.inbound').error('Unexpected error', e)
    //     log.put('rmk', createMsgForException(e))
    //     // 服务端异常，文档中更没有约定返回状态码所以使用'Z'，错误信息记录日志
    //     respJson = createResponse(msgHeader, msgBody, 'Z')
    //   }
    // } else {
    //   respJson = createResponse(msgHeader, msgBody, '2')
    // }
    // if (respJson['STATUS_CODE'] === '0') {
    //   log.put('status', '02')
    // } else {
    //   log.put('status', '03')
    // }
    // var respJsonStr = common.toJson(respJson)
    // log.put('msg_response', respJsonStr)
    // $.queryService.update('scmp_api_log', log, 'status', 'msg_response', 'transmission', 'transmission1', 'rmk')


  }
}
httpHandlers.scmp.user = 'DEFAULT.ADMIN'

//异步任务
tasks.inboundTask = function($, taskContext, args) {
var id = args[0]
  var log = $.queryService.select('scmp_api_log').eq('id', id).find()

  var msgHeader = log.msg_header
  var msgBody = log.msg_body
  msgHeader = common.fromJson(msgHeader)
  msgBody = common.fromJson(msgBody)
  var typeCode = msgHeader.get('TYPE_CODE').asText()
  var interface = SCMP_INBOUNDS[typeCode]
  var contentObj = null
  if (common.SCMP_ENV.DEBUG) {
    // 调试环境直接取CONTENT对象
    contentObj = msgBody.get('CONTENT')
  } else {
    // 生产环境需要取出CONTENT文本后转成JSON对象或数组
    contentObj = common.fromJson(msgBody.get('CONTENT').asText())
  }

  if (interface) {
    try {
      respJson = interface($, msgHeader, msgBody, contentObj, log)
    } catch (e) {
      e = common.throwable(e)
      common.getLogger('scmp.inbound').error('Unexpected error', e)
      log.put('rmk', createMsgForException(e))
      // 服务端异常，文档中更没有约定返回状态码所以使用'Z'，错误信息记录日志
      respJson = createResponse(msgHeader, msgBody, 'Z')
    }
  } else {
    respJson = createResponse(msgHeader, msgBody, '2')
  }
  if (respJson['STATUS_CODE'] === '0') {
    log.put('status', '02')
  } else {
    log.put('status', '03')
  }
  print("============task22233")
  var respJsonStr = common.toJson(respJson)
  log.put('msg_response', respJsonStr)
  $.queryService.update('scmp_api_log', log, 'status', 'msg_response', 'transmission', 'transmission1', 'rmk')
  print("============task4455")
}






function checkOutboundResponse(logObj, msgHeader, msgBody, msgResponse) {
  var resp = jsonObjectToMap(msgResponse)
  if (msgHeader['TYPE_CODE'] != resp.get('TYPE_CODE')) {
    logObj.put('status', '03')
    logObj.put('rmk', '响应中的TYPE_CODE与请求中的不匹配')
  }
  if (msgBody['TIMESTAMP'] != resp.get('REQUEST_TIME')) {
    logObj.put('status', '03')
    logObj.put('rmk', '响应中的REQUEST_TIME与请求中的不匹配')
  }
  var secret = SCMP_ID_CONFIG[msgHeader['ID_CODE']]
  var signValue = sign(secret, resp.get('CONTENT'), resp.get('TIMESTAMP'))
  if (signValue != resp.get('SIGN')) {
    logObj.put('status', '03')
    logObj.put('rmk', '响应中的SIGN错误')
  }
  var status = resp.get('STATUS_CODE')
  if (status == '0') {
    logObj.put('status', '02')
    logObj.put('rmk', resp.get('CONTENT'))
  } else {
    logObj.put('status', '03')
    logObj.put('rmk', resp.get('CONTENT'))
  }
}

function sendOutbound($, logObj, contentObj) {
  var msgHeader = common.hashMap(
    'ID_CODE', logObj.get('id_code'),
    'TYPE_CODE', logObj.get('type'),
    'VERSION', SCMP_VERSION
  )
  var content = common.toJson(contentObj)
  var timestamp = common.formatDateTime(common.now(), 'yyyyMMddHHmmss')
  var msgBody = common.hashMap(
    'CONTENT', content,
    'LENGTH', content.length,
    'TIMESTAMP', timestamp,
    'SIGN', sign(SCMP_ID_CONFIG[logObj.get('id_code')], content, timestamp)
  )
  var data = common.hashMap(
    'MSG_HEADER', common.toJson(msgHeader),
    'MSG_BODY', common.toJson(msgBody)
  )
  logObj.put('msg_header', data['MSG_HEADER'])
  logObj.put('msg_body', data['MSG_BODY'])
  var url = $.getStringPreference('nsc.scmp.url', common.SCMP_ENV.SCMP_URL)
  var httpResponse = common.scmpPostJSON(url, common.toJson(data))
  if (httpResponse.statusCode() === 200) {
    var resp = httpResponse.bodyText()
    print("========= MsgResponse")
    print(resp)
    logObj.put('msg_response', resp.substring(0, 500))
    if (httpResponse.contentType().indexOf('application/json') != -1) {
      var msgResponse = common.fromJson(resp)
      msgResponse = msgResponse.get('d')
      if (msgResponse) {
        msgResponse = common.fromJson(msgResponse.asText())
        checkOutboundResponse(logObj, msgHeader, msgBody, msgResponse)
      } else {
        logObj.put('rmk', 'Invalid JSON response')
        logObj.put('status', '03') // error
      }
    } else {
      logObj.put('rmk', 'Not JSON response')
      logObj.put('status', '03') // error
    }
  } else {
    logObj.put('rmk', 'HTTP ' + httpResponse.statusCode())
    logObj.put('status', '03') // error
    logObj.put('msg_response', httpResponse.bodyText().substring(0, 999))
  }
}

// 导出接口的入口
function outbound($, logObj) {
  if (logObj.direction != '02') {
    throw new java.lang.IllegalArgumentException('输入类型的接口日志不能做输出操作')
  }
  if (logObj.status == '02') {
    throw new java.lang.IllegalArgumentException('状态为成功的接口日志不能做输出操作')
  }
  try {
    var interface = SCMP_OUTBOUNDS[logObj.type]
    if (interface) {
      var secret = SCMP_ID_CONFIG[logObj.id_code]
      if (secret) {
        var contentObj = interface($, logObj)
        sendOutbound($, logObj, contentObj)
      } else {
        throw new java.lang.IllegalArgumentException('接口账户不存在，' + logObj.id_code)
      }
    } else {
      throw new java.lang.IllegalArgumentException('不支持的接口类型，' + logObj.type)
    }
  } catch (e) {
    e = common.throwable(e)
    common.getLogger('scmp.outbound').error('Unexpected error', e)
    logObj.put('status', '03')
    logObj.put('rmk', createMsgForException(e))
  }
  print("===============logObj" + logObj);
  print(logObj.get('version').getClass());
   logObj.put('send_tag',0)
  $.queryService.update('scmp_api_log', logObj, 'status', 'msg_header', 'msg_body', 'msg_response', 'rmk','send_tag')

}
common.scmpOutbound = outbound

// 导出接口的action，用来进行单条数据的导出测试
actions.scmpSubmitOutbound = function($, namespace, request, response) {
  var rows = request.body.selectedRows
  var it = rows.iterator()
  while (it.hasNext()) {
    var row = it.next()
     outbound($,row)
}
  response.message = '输出数据已成功提交，请刷新检索提交结果'
}
actions.scmpSubmitOutbound.namespace = 'scmp_api_logQuery'


// 定时任务， 定时发送
tasks.scmpOutboundTask = function($, taskContext, args) {
  // print('======================== scmpOutboundTask');
  // print(new Date(), 'scmpOutboundTask: ', Java.from(args).join(','))
  // //  直接下面的写法存在 将 VERSION 类型转换错误。
  // ls_sql = " select * from  t01_scmp_api_log  where direction='02'  and status='01' "
  //    var rows = $.jdbcTemplate.queryForList(ls_sql);
  // var rows = $.queryService.select('scmp_api_log').eq('direction', '02').eq('status', '01').eq('send_tag',0).orderBy('insert_date', true).findAll()
  // print("rows===========" + rows)
  var rows
  try {
    $.doInTransactionWithoutResult(function() {
      var sql = "select * from t01_scmp_api_log  api where api.direction=? and api.status=? and api.send_tag=? order by api.transmission1,api.insert_date for update"
      // sql = sql.replaceAll("\"", "\'")
      var args = [02, 01, 0]
      rows = $.queryService.jdbcTemplate.queryForList(sql, args)
      // print("+++++++++sql"+sql)
      print("===========args"+args)
      var send_tag = "update t01_scmp_api_log api  set api.send_tag=1 where api.direction=02 and api.status=01 and api.send_tag=0"
      // send_tag = send_tag.replaceAll("\"", "\'") //将双引号变成单引号
      // print("========send_tag"+send_tag)
      //  $.jdbcTemplate.update(sql)
      $.jdbcTemplate.update(send_tag)
      //  rows = $.queryService.select('scmp_api_log').eq('direction', '02').eq('status', '01').orderBy('insert_date', true).findAll()
      //  执行更新语句

    });
  } catch (e) {
    e = common.throwable(e)
    e.printStackTrace()
  }

  rows.forEach(function(row) {
    // print("++++++++++++++row1" + row)
    var id = row.get('ID')
    id=java.lang.Integer.parseInt(id.toString())
    // print("==============text1" + id)
    row.remove('ID')
    // print("=============text2" + row)
    row.put('id', id)
    // print("=========text3" + row)
    var type = row.get('TYPE')
    row.remove('TYPE')
    row.put('type', type)
    var msg_body = row.get('MSG_BODY')
    row.remove('MSG_BODY')
    row.put('msg_body', msg_body)
    var direction = row.get('DIRECTION')
    row.remove('DIRECTION')
    row.put('direction', direction)
    var msg_header = row.get('MSG_HEADER')
    row.remove('MSG_HEADER')
    row.put('msg_header', msg_header)
    var msg_response = row.get('MSG_RESPONSE')
    row.remove('MSG_RESPONSE')
    row.put('msg_response', msg_response)
    var status = row.get('STATUS')
    row.remove('STATUS')
    row.put('status', status)
    var transmission = row.get('TRANSMISSION')
    row.remove('TRANSMISSION')
    row.put('transmission', transmission)
    var rmk = row.get('RMK')
    row.remove('RMK')
    row.put('rmk', rmk)
    var version = row.get('VERSION')
    version=java.lang.Integer.parseInt(version.toString())
    row.remove('VERSION')
    row.put('version', version)
    var insert_user = row.get('INSERT_USER')
    row.remove('INSERT_USER')
    row.put('insert_user', insert_user)
    var insert_date = row.get('INSERT_DATE')
    row.remove('INSERT_DATE')
    row.put('insert_date', insert_date)
    var update_user = row.get('UPDATE_USER')
    row.remove('UPDATE_USER')
    row.put('update_user', update_user)
    var update_date = row.get('UPDATE_DATE')
    row.remove('UPDATE_DATE')
    row.put('update_date', update_date)
    var id_code = row.get('ID_CODE')
    row.remove('ID_CODE')
    row.put('id_code', id_code)
    var transmission1 = row.get('TRANSMISSION1')
    row.remove('TRANSMISSION1')
    row.put('transmission1', transmission1)
    var send_tag = row.get('SEND_TAG')
    // print("=======before"+send_tag)
    // print("========beforclass"+  send_tag.getClass())
    send_tag=java.lang.Integer.parseInt(send_tag.toString())
    // print("=======after"+send_tag)
    // print("========afterclass"+  send_tag.getClass())
    row.remove('SEND_TAG')
    row.put('send_tag', send_tag)
    // print("=========text4" + row)
    outbound($, row)
  //   var id=row.id
  //   var sql = "insert into ncs_plan_logic_log (create_time,default5)  " +
  //     "values (SYSDATE,"+id+")"
  //   sql = sql.replaceAll("\"", "\'") //将双引号变成单引号
  //   $.jdbcTemplate.update(sql)
  //  print("=====textsql"+sql)
  })


}





actions.ResendRecommand = function($, namspace, request, response) {
  var actionData = request.body
  var rows = actionData.selectedRows
  var it = rows.iterator()
  while (it.hasNext()) {
    var row = it.next()
      if (row.status == 02) {
       throw '该订单已成功提交，不能重复提交'
      } else {
    var msgHeader = row.msg_header
    var msgHeader = common.fromJson(msgHeader)
    print("============msgHeader1111" + msgHeader)
    var msgBody = row.msg_body
    var msgBody = common.fromJson(msgBody)
    // print("============msgBody1111" + msgBody)
    //  var contentObj = msgBody.get('CONTENT')
    var contentObj = common.fromJson(msgBody.get('CONTENT').asText())
    // print("============contentObj" + contentObj)
    var typeCode = msgHeader.get('TYPE_CODE').asText()
    print("==========typeCode" + typeCode)
    var log = row
    // print("+++++++log" + log)
    print("=======99999")
    var interface = SCMP_INBOUNDS[typeCode]

    interface($, msgHeader, msgBody, contentObj, log)

    log.put('status', '02')
    var remark = log.get("rmk")
    log.put('rmk', remark + '重新提交已成功')
    $.queryService.update('scmp_api_log', log, 'status', 'msg_response', 'transmission', 'transmission1', 'rmk')
      }
  }


  response.message = '成功重发 ' + rows.size() + ' 条数据的订单'
  //  response.code = 'refresh';
}
actions.ResendRecommand.namespace = '*'



// 批量更新数据状态为初始状态
actions.returnStatus = function($, namespace, request, response) {
  var rows = request.body.selectedRows
  var it = rows.iterator()
    var jdbcTemplate = $.queryService.jdbcTemplate
  while (it.hasNext()) {
    var row = it.next()
    var sql = "UPDATE  T01_SCMP_API_LOG API SET API.STATUS='01' WHERE ID=?"
    jdbcTemplate.update(sql, common.objectArray(row.id))

  }
  response.message = '已更新为初始状态'
}
actions.returnStatus.namespace = '*'
