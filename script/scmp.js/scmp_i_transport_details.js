// TRANSPORT_DETAILS  取货实绩发送接口
common.SCMP_INBOUNDS['TRANSPORT_DETAILS'] = function($, reqHeader, reqBody, contentObj, logObj) {
    var it = contentObj.iterator()
    while (it.hasNext()) { // HEADER loop
        var obj = it.next()
        print("=======obj" + obj)
        var transport_bill_code = obj.get('TRANSPORT_BILL_CODE')
        var transport_bill_code_3pl = obj.get('TRANSPORT_BILL_CODE_3PL') //从对象obj中获取所需字段
        var car_no = obj.get('CAR_NO')
        var driver_code = obj.get('DRIVER_CODE')
        var driver_name = obj.get('DRIVER_NAME')
        var scan_time = obj.get('SCAN_TIME')
        var supplier_code = obj.get('SUPPLIER_CODE')
        var send_place_code = obj.get('SEND_PLACE_CODE')


        var insert_user = "\"" + "ADMIN" + "\""
        //获取最大ID
        ls_maxid_sql = " select TRANSPORT_DETAILS_SEQ.NEXTVAL AS ID from  dual   "
        var rows = $.jdbcTemplate.queryForList(ls_maxid_sql);
        var li_in_storage_maxid = rows[0].ID;


        var tray_code = obj.get('TRAY_CODE_LIST')
        var delivery_bill= obj.get('DELIVERY_BILL_LIST')
        var tcIt = tray_code.iterator()
        var ls_ship_xid = "" //拼tray_code作为查询条件
        while (tcIt.hasNext()) { //取出数组里的值拼成字符串
            var trayDetail = tcIt.next()
            ls_ship_xid = ls_ship_xid + trayDetail + ','
            print("======ls_ship_xid" + ls_ship_xid)
        }
        ls_ship_xid = ls_ship_xid.substring(0, ls_ship_xid.length - 1) //去除最后一个逗号
        ls_ship_xid=ls_ship_xid.replaceAll("\"","")
         ls_ship_xid="\""+ls_ship_xid+"\""



        var dbIt = delivery_bill.iterator()
        var ls_delivery_bill = ""
        while (dbIt.hasNext()) {
            var bill = dbIt.next()
            ls_delivery_bill = ls_delivery_bill + bill + ','
            print("======ls_delivery_bill" + ls_delivery_bill)
        }
        ls_delivery_bill = ls_delivery_bill.substring(0, ls_delivery_bill.length - 1) //去除最后一个逗号
        ls_delivery_bill=ls_delivery_bill.replaceAll("\"","")
         ls_delivery_bill="\""+ls_delivery_bill+"\""


        var insert_storage_sql = "insert into NCS_INFO_TRANSPORT_DETAILS (ID,TRANSPORT_BILL_CODE,TRANSPORT_BILL_CODE_3PL,CAR_NO,DRIVER_CODE,DRIVER_NAME,SCAN_TIME,SUPPLIER_CODE,SEND_PLACE_CODE,TRAY_CODE_LIST,DELIVERY_BILL_LIST,INSERT_USER,Insert_Date)  " +
            "values (" + li_in_storage_maxid + "," + transport_bill_code + "," + transport_bill_code_3pl + "," + car_no + "," + driver_code + "," + driver_name + "," + scan_time + "," + supplier_code + "," + send_place_code + "," + ls_ship_xid + ","+ls_delivery_bill+"," + insert_user + " ,  SYSDATE  )"
        insert_storage_sql = insert_storage_sql.replaceAll("\"", "\'") //将双引号变成单引号

        try {
          $.doInTransactionWithoutResult(function() {
              print("=======insert_storage_sql" + insert_storage_sql)
              $.jdbcTemplate.update(insert_storage_sql)
          });
        } catch (e) {
            e = common.throwable(e)
            e.printStackTrace()
        }
        ls_ship_xid = "" //清空每次循环的拼接字符串
        ls_delivery_bill=""
    }
    return common.scmpCreateResponse(reqHeader, reqBody, '0', 'OK')
}
