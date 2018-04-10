// OUT_STORAGE_DETAILS  出库实绩发送接口
common.SCMP_INBOUNDS['OUT_STORAGE_DETAILS'] = function($, reqHeader, reqBody, contentObj, logObj) {
  var it = contentObj.iterator()
  while (it.hasNext()) { // HEADER loop
    var obj = it.next()
    print("=======obj" + obj)
    var transport_bill_code = obj.get('TRANSPORT_BILL_CODE') //从对象obj中获取所需字段
    var car_no = obj.get('CAR_NO')
    var driver_code = obj.get('DRIVER_CODE')
    var driver_name = obj.get('DRIVER_NAME')
    var out_storage_time = obj.get('OUT_STORAGE_TIME')
    var storage_code = obj.get('STORAGE_CODE')
    var scaner = obj.get('SCANER')
    var tray_code = obj.get('TRAY_CODE_LIST')
    var delivery_bill = obj.get('DELIVERY_BILL_LIST')
    var  insert_user="ADMIN"
    var tcIt = tray_code.iterator()
    var dbIt = delivery_bill.iterator()

    var ls_ship_xid = ""
    var ls_delivery_bill = ""

    if(tray_code.length=0)   {
    tray_code = "\"" + "" + "\""
    } else{
    while (tcIt.hasNext()) { //取出数组里的值拼成字符串
      var trayDetail = tcIt.next()
      print("======trayDetail" + trayDetail)
      ls_ship_xid = ls_ship_xid + trayDetail + ','

    }
    ls_ship_xid = ls_ship_xid.substring(0, ls_ship_xid.length - 1)
    ls_ship_xid=ls_ship_xid.replaceAll("\"","")
     ls_ship_xid="\""+ls_ship_xid+"\""
  }
  print("======ls_ship_xid" + ls_ship_xid)

  if(delivery_bill.length=0)   {
    delivery_bill = "\"" + "" + "\""
  } else{
    while (dbIt.hasNext())
    { //取出数组里的值拼成字符串
      var billDetail = dbIt.next()
      ls_delivery_bill = ls_delivery_bill + billDetail + ','
    }
      ls_delivery_bill = ls_delivery_bill.substring(0, ls_delivery_bill.length - 1)//去除最后一个逗号
    }  ls_delivery_bill=ls_delivery_bill.replaceAll("\"","")
    ls_delivery_bill="\""+ls_delivery_bill+"\""
      print("======ls_delivery_bill" + ls_delivery_bill)
    try {
      $.doInTransactionWithoutResult(function() {
        var sql = "insert into NCS_INFO_OUT_STORAGE_DETAILS(ID,transport_bill_code,car_no,driver_code,driver_name,out_storage_time,tray_code_list,delivery_bill_list,storage_code,scaner,insert_date)  values (STORAGE_DETAILS_SEQ.NEXTVAL," + transport_bill_code + "," + car_no + "," + driver_code + "," + driver_name + "," + out_storage_time + "," + ls_ship_xid +"," + ls_delivery_bill + "," + storage_code + "," + scaner + ", SYSDATE)"
        print("=======sql" + sql)
        sql = sql.replaceAll("\"", "\'")//将双引号变成单引号
        print("=======sql" + sql)

        $.jdbcTemplate.update(sql)
        //  执行更新语句s

      });
    } catch (e) {
      e = common.throwable(e)
      e.printStackTrace()
    }
    ls_ship_xid = ""  //清空每次循环的拼接字符串
    ls_delivery_bill = ""
  }
  return common.scmpCreateResponse(reqHeader, reqBody, '0', 'OK')
}
