// TRANSPORT_PLAN_CONFIRM

//  get   TransmissionNo
function extractTransmissionNo(xml) {
  var beginTag = '<ReferenceTransmissionNo>'
  var endTag = '</ReferenceTransmissionNo>'
  var begin = xml.indexOf(beginTag)
  if (begin !== -1) {
    return xml.substring(begin+beginTag.length, xml.indexOf(endTag))
  } else {
    return 'NO_TRANSMISSION'
  }
}

function callOTM($, shipmentList) {
  // 调用Freemarker生成OTM XML
  var data = common.hashMap(
    'shipments', shipmentList
    )
  print("=============test data"+data)
  var templatePath = 'freemarker/scmp/shipment_confirm.ftl'
  var template = common.loadFreemarker($, templatePath)
  var otmXml = common.freemarker.render(templatePath, template, data)
  print ("================================otmXml")
  print (otmXml)
  // Post to OTM inbound
  var httpResponse = common.httpRequest.post(common.SCMP_ENV.OTM_URL).bodyText(otmXml, 'text/xml', 'UTF-8').send()
  if (httpResponse.statusCode() === 200) {
    var resp = httpResponse.bodyText()
    print('OTM RESPONSE:')
    print(resp)
    return extractTransmissionNo(resp)
  } else {
    return 'HTTP ' + httpResponse.statusCode()
  }
}

// TRANSPORT_PLAN_CONFIRM  配车方案确认接口
common.SCMP_INBOUNDS['TRANSPORT_PLAN_CONFIRM'] = function ($, reqHeader, reqBody, contentObj, logObj) {
  var shipmentList = common.arrayList()
  var it = contentObj.iterator()
  while (it.hasNext()) {  // HEADER loop
    var obj = it.next()
    var header = common.scmpJsonObjectToMap(obj)
     shipmentList.add( header)
  }
  if (shipmentList.length > 0) {
    var transmission = callOTM($, shipmentList)
    logObj.put('transmission', transmission)
  }
  return common.scmpCreateResponse(reqHeader, reqBody, '0', 'OK')
}
