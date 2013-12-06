Ext.override(Rally.ui.picker.FieldPicker,{

    _buildStoreData: function(models) {
        var me = this;
        var data = {};
        Ext.Object.each(models, function(modelName, model) {
            var fields = _.filter(model.getFields(), this._shouldShowField, this);
            var otherModels = _.difference(Ext.Object.getValues(models), [model]);

            _.each(fields, function(field) {
                var continue_flag = true;
                if (typeof(this.ts_field_filter) == "function" ) {
                    continue_flag = this.ts_field_filter(field);
                }
                if ( continue_flag ) {
                    var fieldNameWithoutPrefix = field.name.replace(/^c_/, '');
                    if (!data[fieldNameWithoutPrefix]) {
                        data[fieldNameWithoutPrefix] = {
                            name: field.name,
                            displayName: this._getFieldDisplayName(field)
                        };
    
                        var otherModelsWithField = _.filter(otherModels, function(otherModel) {
                            return otherModel.hasField(fieldNameWithoutPrefix) && this._shouldShowField(otherModel.getField(fieldNameWithoutPrefix));
                        }, this);
    
                        if (otherModelsWithField.length !== otherModels.length) {
                            var modelsWithField = [model.displayName].concat(_.pluck(otherModelsWithField, 'displayName'));
                            data[fieldNameWithoutPrefix].displayName += ' (' + modelsWithField.join(', ') + ')';
                        }
                    }
                }
            }, this);
        }, this);
        return data;
    }
});