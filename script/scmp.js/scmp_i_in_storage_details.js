// IN_STORAGE_DETAILS  入库实绩发送接口   4.7
common.SCMP_INBOUNDS['IN_STORAGE_DETAILS'] = function($, reqHeader, reqBody, contentObj, logObj) {
  var it = contentObj.iterator()
  while (it.hasNext()) { // HEADER loop
    var obj = it.next()
    print("=======obj" + obj)
    var transport_bill_code = obj.get('TRANSPORT_BILL_CODE') // 运单号
    var transport_bill_code_3pl = obj.get('TRANSPORT_BILL_CODE_3PL') //运单号（物流商）
    var car_no = obj.get('CAR_NO') // 车牌号
    var driver_code = obj.get('DRIVER_CODE') //司机编码
    var driver_name = obj.get('DRIVER_NAME') // 司机姓名
    var in_storage_time = obj.get('IN_STORAGE_TIME') //入库时间
    var storage_code = obj.get('STORAGE_CODE') // 仓库编码
    var car_abnormity_list = obj.get('CAR_ABNORMITY_LIST') //车辆异常信息编码

    var carabnormitys = car_abnormity_list.iterator()
    var ls_carabnormitys = "" //拼tray_code作为查询条件
    while (carabnormitys.hasNext()) { //取出数组里的值拼成字符串
      var carabnormity = carabnormitys.next()
      ls_carabnormitys = ls_carabnormitys + carabnormity + ','
    }
    ls_carabnormitys = ls_carabnormitys.substring(0, ls_carabnormitys.length - 1) //去除最后一个逗号
    if (ls_carabnormitys && ls_carabnormitys.length > 1) {
      ls_carabnormitys = ls_carabnormitys.replaceAll("\"", "") //
      ls_carabnormitys = "\"" + ls_carabnormitys + "\"";
    } else {
      ls_carabnormitys = "\"" + "" + "\"";
    }

    var tray_scan_details = obj.get('TRAY_SCAN_DETAIL_LIST') //实际取货托盘编码

    var delivery_bill_list = obj.get('DELIVERY_BILL_LIST') //入库交货单编码
    var deliverybills = delivery_bill_list.iterator()
    var ls_deliverybills = "" //拼tray_code作为查询条件
    while (deliverybills.hasNext()) { //取出数组里的值拼成字符串
      var deliverybill = deliverybills.next()
      ls_deliverybills = ls_deliverybills + deliverybill + ','
    }
    ls_deliverybills = ls_deliverybills.substring(0, ls_deliverybills.length - 1) //去除最后一个逗号
    if (ls_deliverybills && ls_deliverybills.length > 1) {
      //  print("ls_deliverybills======" + ls_deliverybills)
      ls_deliverybills = ls_deliverybills.replaceAll("\"", "") //
      ls_deliverybills = "\"" + ls_deliverybills + "\"";
    } else {
      ls_deliverybills = "\"" + "" + "\"";
    }

    var scaner = obj.get('SCANER') // 扫描人编码
    var tcIt = tray_scan_details.iterator()
    var insert_user = "\"" + "ADMIN" + "\""
    //获取最大ID
    ls_maxid_sql = " select NCS_INFO_IN_STORAGE_SEQ.NEXTVAL AS ID from  dual   "
    var rows = $.jdbcTemplate.queryForList(ls_maxid_sql);
    var li_in_storage_maxid = rows[0].ID;

    // 插入头档
    var insert_storage_sql = "insert into NCS_INFO_IN_STORAGE (ID,TRANSPORT_BILL_CODE,TRANSPORT_BILL_CODE_3PL,CAR_NO,DRIVER_CODE,DRIVER_NAME,IN_STORAGE_TIME,STORAGE_CODE,CAR_ABNORMITY_LIST,DELIVERY_BILL_LIST,SCANER,INSERT_USER,Insert_Date)  " +
      "values (" + li_in_storage_maxid + "," + transport_bill_code + "," + transport_bill_code_3pl + "," + car_no + "," + driver_code + "," + driver_name + "," + in_storage_time + "," + storage_code + "," + ls_carabnormitys + "," + ls_deliverybills + "," + scaner + "," + insert_user + " ,  SYSDATE  )"
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
    // 插入明细
    while (tcIt.hasNext()) {
      var trayDetail = tcIt.next()
      var tray_code = trayDetail.get("TRAY_CODE")
      var scan_time = trayDetail.get("SCAN_TIME")
      var tray_abnormity_list = trayDetail.get("TRAY_ABNORMITY_LIST")
      var trayabnormityds = delivery_bill_list.iterator()
      var ls_trayabnormityds = "" //拼tray_code作为查询条件
      while (trayabnormityds.hasNext()) { //取出数组里的值拼成字符串
        var trayabnormityd = trayabnormityds.next()
        ls_trayabnormityds = ls_trayabnormityds + trayabnormityd + ','
      }
      ls_trayabnormityds = ls_trayabnormityds.substring(0, ls_trayabnormityds.length - 1) //去除最后一个逗号
      //           print ("===================ls_trayabnormityds"+ls_trayabnormityds);
      if (ls_trayabnormityds.length > 1) {
        ls_trayabnormityds = ls_trayabnormityds.replaceAll("\"", "") //
        ls_trayabnormityds = "\"" + ls_trayabnormityds + "\""
      } else {
        ls_trayabnormityds = "\"" + "" + "\""
      }






      var insert_storage_details_sql = "insert into NCS_INFO_IN_STORAGE_DETAILS(ID,NCS_INFO_IN_STORAGE_ID,TRAY_CODE,SCAN_TIME,TRAY_ABNORMITY_LIST,Insert_User,STORAGE_CODE ,Insert_Date)" +
        "values (NCS_INFO_IN_STORAGE_D_SEQ.NEXTVAL," + li_in_storage_maxid + "," + tray_code + "," + scan_time + "," + ls_trayabnormityds + "," + insert_user + "," + storage_code + " , SYSDATE  )"
      insert_storage_details_sql = insert_storage_details_sql.replaceAll("\"", "\'") //将双引号变成单引号
      try {
        $.doInTransactionWithoutResult(function() {
          print("=======insert_storage_details_sql" + insert_storage_details_sql)
          $.jdbcTemplate.update(insert_storage_details_sql)
        });
      } catch (e) {
        e = common.throwable(e)
        e.printStackTrace()
      }
    }




  }
  return common.scmpCreateResponse(reqHeader, reqBody, '0', 'OK')
}
