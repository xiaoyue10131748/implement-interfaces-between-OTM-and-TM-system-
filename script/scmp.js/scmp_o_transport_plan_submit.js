var certify_sql =
"select * from shipment  ship " +
"left join order_movement  om on om.shipment_gid=ship.shipment_gid " +
"left join order_release  ore on ore.order_release_gid=om.order_release_gid "+
"left join location loc on loc.location_gid=ore.source_location_gid " +
"where ship.shipment_gid=? and loc.attribute19 like  '%' || nvl( om.attribute18,'no_match') || '%' "

var SQL =
"SELECT " +
"SHIP.SHIPMENT_XID AS TRANSPORT_CODE, " +
"REPLACE(SHIP.POWER_UNIT_GID,'NCS.','') AS CAR_NO, " +
"REPLACE(SHIP.DRIVER_GID,'NCS.','')AS DRIVER_CODE, " +
"TO_CHAR(SHIP.START_TIME+1/3, 'YYYY-MM-DD') AS TRANSPORT_DATE, " +
"T.LINE_ARRANGE AS LINE_ARRANGE, " +
"D.ATTRIBUTE7  AS MAKE_EMP, " +
"SHIP.SHIPMENT_XID || '_2' || ORE.ATTRIBUTE13 || '_' || ORE.ATTRIBUTE15 || '_' || ORE.ATTRIBUTE18 || '_' || ORE.ATTRIBUTE13 AS SCHEME_CODE, " +
"ORE.ATTRIBUTE13 AS SUPPLIER_CODE, " +
"ORE.ATTRIBUTE15 AS SEND_PLACE_CODE, " +
"ORE.ATTRIBUTE18 AS NEED_GOODS_CODE, " +
"TO_CHAR(SHIPSTOP.PLANNED_ARRIVAL + 1/3, 'YYYY-MM-DD HH24:MI') AS PLAN_PICKUP_TIME, " +
"SU.TAG_1 AS TRAY_CODE " +
"FROM SHIPMENT SHIP " +
"LEFT JOIN ORDER_MOVEMENT OM ON OM.SHIPMENT_GID = SHIP.SHIPMENT_GID " +
"LEFT JOIN ORDER_RELEASE ORE ON ORE.ORDER_RELEASE_GID = OM.ORDER_RELEASE_GID " +
"LEFT JOIN ORDER_MOVEMENT_D OMD ON OM.ORDER_MOVEMENT_GID = OMD.ORDER_MOVEMENT_GID " +
"LEFT JOIN S_SHIP_UNIT SSU ON SSU.S_SHIP_UNIT_GID = OMD.S_SHIP_UNIT_GID " +
"LEFT JOIN SHIP_UNIT SU ON SU.SHIP_UNIT_GID = SSU.SHIP_UNIT_GID " +
"LEFT JOIN DRIVER D ON D.DRIVER_GID = SHIP.DRIVER_GID " +
"LEFT JOIN CONTACT CON ON CON.CONTACT_GID = SHIP.INSERT_USER "+
"LEFT JOIN (SELECT SS.SHIPMENT_GID, "+
                    "CASE  WHEN SUM(CASE  WHEN SS.STOP_TYPE = 'P' THEN   1     ELSE  0   END) > 1 THEN  3 "+
                      "WHEN S.ATTRIBUTE17 = '入集配'  THEN  1 "+
                      "WHEN S.ATTRIBUTE17 = '出集配'  THEN  3 "+
                      "ELSE 0 END AS LINE_ARRANGE "+
               "FROM SHIPMENT_STOP SS, SHIPMENT S "+
              "WHERE SS.SHIPMENT_GID = S.SHIPMENT_GID "+
              "GROUP BY SS.SHIPMENT_GID, S.ATTRIBUTE17) T "+
    "ON T.SHIPMENT_GID = SHIP.SHIPMENT_GID "+
"LEFT JOIN (SELECT SST.SHIPMENT_GID, SST.LOCATION_GID,MIN(SST.PLANNED_ARRIVAL) AS PLANNED_ARRIVAL  "+
               "FROM SHIPMENT_STOP SST "+
              "WHERE  SST.STOP_TYPE = 'P' "+
              "GROUP BY SST.SHIPMENT_GID, SST.LOCATION_GID) SHIPSTOP "+
    "ON SHIPSTOP.SHIPMENT_GID = SHIP.SHIPMENT_GID  AND SHIPSTOP.LOCATION_GID = OM.SOURCE_LOCATION_GID "+
"WHERE SHIP.SHIPMENT_GID=? " +
"ORDER BY SHIP.SHIPMENT_GID,ORE.ATTRIBUTE13,ORE.ATTRIBUTE15,ORE.ATTRIBUTE18"

common.SCMP_OUTBOUNDS['TRANSPORT_PLAN_SUBMIT'] = function ($, logObj) {
  var gid = logObj.get('transmission')
  if(gid){
        print("=========userName3333"+$.userName)
      var list = $.queryService.jdbcTemplate.queryForList(certify_sql, gid)
      print("=========userName4444"+$.userName)
      if (list.size() == 0) {

        throw new java.lang.IllegalArgumentException('该供应商不允许发送配车方案接口')

  }
    print("++++9090"+list.size())
}
  if (gid) {
    var list = $.queryService.jdbcTemplate.queryForList(SQL, gid)
    if (list.size() == 0) {
      throw new java.lang.IllegalArgumentException('未检索到数据')
    }
    // 按二级数据全部字段分组
    var detailGroups = list.stream().collect(java.util.stream.Collectors.groupingBy(function (row) {
      var key = ['SUPPLIER_CODE','SEND_PLACE_CODE','NEED_GOODS_CODE'].map(function (c) {
        return row.get(c)
      }).join('.')
       print ('*** ====key'+ key)
      return key
    })).values()
     print('*** detailGroups', detailGroups.size(), detailGroups)
    // 任取一行二级数据填充一级数据
    var detail = detailGroups.iterator().next().get(0)
    print('*** detail', detail)
    var data = common.hashMap(
      'TRANSPORT_CODE', detail.get('TRANSPORT_CODE'),
      'CAR_NO', detail.get('CAR_NO'),
      'DRIVER_CODE', detail.get('DRIVER_CODE'),
      'TRANSPORT_DATE', detail.get('TRANSPORT_DATE'),
      'LINE_ARRANGE', detail.get('LINE_ARRANGE'),
      'MAKE_EMP', detail.get('MAKE_EMP')
      )
    // 填充二级数据字段
    var assignPlanList = common.arrayList()
    data.put('ASSIGN_PLAN_LIST', assignPlanList)
    Java.from(detailGroups).forEach(function (detailGroup) {
      var assignPlan = common.hashMap(
          'SCHEME_CODE', detailGroup[0].get('SCHEME_CODE'),
          'SUPPLIER_CODE', detailGroup[0].get('SUPPLIER_CODE'),
          'SEND_PLACE_CODE', detailGroup[0].get('SEND_PLACE_CODE'),
          'NEED_GOODS_CODE', detailGroup[0].get('NEED_GOODS_CODE'),
          'PLAN_PICKUP_TIME', detailGroup[0].get('PLAN_PICKUP_TIME')
        )
        // var a=assignPlan.get('SEND_PLACE_CODE')
        // var b=a.indexOf("-")
        // print("=========1234"+b)
        // var c=a.substring(++b)
        //  print("=========xiaoyuee"+c)
        //
        //  assignPlan.put('SEND_PLACE_CODE',c)

      var trayCodeList = Java.from(detailGroup).map(function (d) { return d.get('TRAY_CODE') })
      assignPlan.put('TRAY_CODE_LIST', Java.to(trayCodeList))
      assignPlanList.add(assignPlan)
    })





      return common.objectArray(data)
  } else {
    throw new java.lang.IllegalArgumentException('未设置OTM对象ID')
  }
}
