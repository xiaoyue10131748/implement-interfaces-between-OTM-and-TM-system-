common.SCMP_INBOUNDS['TRANSPORT_PLAN_SUBMIT'] = function ($, reqHeader, reqBody, contentObj, logObj) {
  print(common.toJson(contentObj))
  print("================TRANSPORT_PLAN_SUBMIT  === "+common.toJson(contentObj))

  return common.scmpCreateResponse(reqHeader, reqBody, '0', 'OK')
}
