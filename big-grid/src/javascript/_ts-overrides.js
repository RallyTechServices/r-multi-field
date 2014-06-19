Ext.override(Rally.ui.menu.bulk.RecordMenu,{
    items: [
        {xtype: 'rallyrecordmenuitembulkedit'},
        {xtype: 'rallyrecordmenuitembulktag'},
        {xtype: 'rallyrecordmenuitembulkparent'},
        {xtype: 'rallyrecordmenuitembulkdefecttouserstory'},
        {xtype: 'rallyrecordmenuitembulktasktoworkproduct'},
        {xtype: 'rallyrecordmenuitembulktestcasetoworkproduct'},
        {xtype: 'rallyrecordmenuitembulktestcasetotestfolder'},
        {xtype: 'rallyrecordmenuitembulkportfolioitemstate'}
    ],
});
