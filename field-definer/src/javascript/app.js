Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    logger: new Rally.technicalservices.logger(),
    items: [
        {xtype:'container',itemId:'message_box'},
        {xtype:'container',itemId:'selector_box', padding: 5, margin: 5, items: [
            {
                fieldLabel: 'MulitiSelect Field', 
                xtype:'rallyfieldcombobox', 
                model: 'UserStory', 
                itemId: 'field_selector'
            }
        ]},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        var field_store = this.down('#field_selector').getStore();
        field_store.on('load',this._filterOutExceptText,this);
    },
    _filterOutExceptText: function(store,records) {
        store.filter([{
            filterFn:function(field){ 
                return field.get('fieldDefinition').attributeDefinition.AttributeType == "TEXT";
            } 
        }]);
        this.down('#field_selector').setValue(store.getAt(1));

    }
});