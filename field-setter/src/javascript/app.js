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
    },
    _makeGrid: function() {
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
                {text:'Name',dataIndex:'Name',flex:1},
                {text:'Notes',dataIndex:'Notes',editor:{
                    xtype:'tsmultipicker'
                }},
                {text:'Tags',dataIndex:'Tags',editor:{xtype:'rallytagpicker'}}
            ]
        });
        
        this.down('#grid_box').add(grid);
    }
});
