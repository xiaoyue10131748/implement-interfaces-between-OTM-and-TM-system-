
// ORDER_DELETED_NOTICE
common.SCMP_INBOUNDS['ORDER_DELETED_NOTICE'] = function($, reqHeader, reqBody, contentObj, logObj) {
  print("========contentObj"+contentObj)
    var contentObj = common.scmpJsonObjectToMap(contentObj)
  // var it = contentObj.iterator()
  // while (it.hasNext()) { // HEADER loop
  //   var obj = it.next()
  //   print("=======obj" + obj)
    var deleted_order_list = contentObj.get('DELETED_ORDER_LIST') //入库返空单列表
    var insert_user = "\"" + "ADMIN" + "\""
    //获取最大ID
    ls_maxid_sql = "select NCS_INFO_ORDER_D_NOTICE_SEQ.NEXTVAL AS ID from  dual"
    var rows = $.jdbcTemplate.queryForList(ls_maxid_sql);
    var li_in_storage_maxid = rows[0].ID;
    //in_storage_list = "\"" + "" + "\""
    var insert_storage_sql = "insert into NCS_INFO_ORDER_D_NOTICE (ID,INSERT_USER,Insert_Date)  " +
      "values (" + li_in_storage_maxid + "," + insert_user + " ,  SYSDATE  )"
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

    var orderList = deleted_order_list.iterator()

    while (orderList.hasNext()) { //取出数组里的值拼成字符串
      var ctIt = orderList.next()
      var issue_code = ctIt.get('ISSUE_CODE')
      var supplier_code = ctIt.get('SUPPLIER_CODE')
      var send_place_code = ctIt.get('SEND_PLACE_CODE')
      var need_goods_code = ctIt.get('NEED_GOODS_CODE')
      var need_place_code = ctIt.get('NEED_PLACE_CODE')
      var part_code = ctIt.get('PART_CODE')
      var arri_plan_date = ctIt.get('ARRI_PLAN_DATE').asText()
          //print("time_before"+arri_plan_date)
      arri_plan_date= common.scmpDecodeTime(arri_plan_date)
    //  print("time_after"+arri_plan_date)
      var work_order_no = ctIt.get('WORK_ORDER_NO')
      var order_qty = ctIt.get('ORDER_QTY')
      var snp = ctIt.get('SNP')
      var delete_time = ctIt.get('DELETE_TIME')
      var delete_emp = ctIt.get('DELETE_EMP')
      var deleted_tray_list = ctIt.get('DELETED_TRAY_LIST')
           var trayList = deleted_tray_list.iterator()
           var trayLists=""
           while (trayList.hasNext()) { //取出数组里的值拼成字符串
               var is_trayList = trayList.next()
               trayLists = trayLists + is_trayList + ','
           }
           trayLists = trayLists.substring(0, trayLists.length - 1) //去除最后一个逗号
           if (trayLists && trayLists.length > 1) {
               trayLists = trayLists.replaceAll("\"", "") //
               trayLists = "\"" + trayLists + "\"";
           } else {
               trayLists = "\"" + "" + "\"";
           }




      // 插入明细
      var insert_storage_details_sql = "insert into NCS_INFO_ORDER_D_DETAILS(ID,DELETED_ORDER_ID,ISSUE_CODE,SUPPLIER_CODE,SEND_PLACE_CODE,NEED_GOODS_CODE,NEED_PLACE_CODE ,PART_CODE,ARRI_PLAN_DATE,WORK_ORDER_NO,ORDER_QTY,SNP,DELETE_TIME,DELETE_EMP,DELETED_TRAY_LIST,Insert_User,Insert_Date)" +
        "values (NCS_INFO_ORDER_D_DETAILS_SEQ.NEXTVAL," + li_in_storage_maxid + "," + issue_code + "," + supplier_code + "," + send_place_code + "," + need_goods_code + "," + need_place_code + "," + part_code + "," + arri_plan_date + "," + work_order_no + "," + order_qty + "," + snp + ","+delete_time+ "," + delete_emp+ ","+trayLists+","+ insert_user + " , SYSDATE  )"
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






  // }


  return common.scmpCreateResponse(reqHeader, reqBody, '0', 'OK')
}
