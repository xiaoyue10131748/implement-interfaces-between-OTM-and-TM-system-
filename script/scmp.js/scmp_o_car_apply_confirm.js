var SQL =
 "SELECT "+
 "order_release_name as APPLY_CODE_LIST,"+
" max(update_user) as  CONF_EMP"+
" FROM  order_release "+
" WHERE order_release_name = ? "+
" group by order_release_name"

common.SCMP_OUTBOUNDS['CAR_APPLY_CONFIRM'] = function ($, logObj) {
  var gid = logObj.get('transmission')
  print("======SQL"+SQL)
  if (gid) {
      print("=========userName555"+$.userName)
      print("=========user")
    var list = $.queryService.jdbcTemplate.queryForList(SQL, gid)
      print("=========userName666"+$.userName)
    if (list.size() == 0) {
      throw new java.lang.IllegalArgumentException('未检索到数据')
    }
    print("========list"+list)

    var contentObj=list.iterator().next()

    var data = common.hashMap(
      'CONF_EMP', contentObj.get('CONF_EMP')
    )
    var applyCodeList = common.arrayList()
    data.put('APPLY_CODE_LIST', applyCodeList)
    var applyCode = contentObj.get('APPLY_CODE_LIST')
    print("=====applyCode"+applyCode)
    applyCodeList.add(applyCode)
    print("======data"+data)
    return common.objectArray(data)
  } else {
    throw new java.lang.IllegalArgumentException('未设置OTM对象ID')
  }
}
