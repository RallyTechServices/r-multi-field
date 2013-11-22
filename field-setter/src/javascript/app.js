Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    logger: new Rally.technicalservices.Logger(),
    items: [
        {xtype:'container',itemId:'grid_box',padding:5},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        this._makeGrid();
        this.subscribe(this, 'choiceDefinerMessage', this._makeGrid, this);
    },
    _makeGrid: function() {
        this.down('#grid_box').removeAll();
        
        var store = Ext.create('Rally.data.WsapiDataStore',{
            model:'UserStory',
            pageSize: 25,
            autoLoad: true
        });
        
        var grid = Ext.create('Rally.ui.grid.Grid',{
            store: store,
            height: 500,
            columnCfgs: [
                {text:'id',dataIndex:'FormattedID'},
                {text:'Name',dataIndex:'Name',flex:1,editor:'rallytextfield'},
                {text:'Notes',dataIndex:'Notes',editor:{
                    xtype:'tsmultipicker',
                    field_name:'Notes'
                }}
            ]
        });
        
        this.down('#grid_box').add(grid);
        
        
    }
});
