### table组件
table组件是对[Ant-design-vue table组件](https://www.antdv.com/components/table-cn/)的二次封装，table的其它属性可以参考ant-design-vue文档

##### table
| 属性 | 类型 | 是否必须 |  默认值  | 说明 |
| --- | --- | --- | --- | ---|
| data | Function | 是 |  | 加载table数据的后台api方法 |
| alert | Object,Boolean | 否 |  | 是否显示已选择表格数据的条数信息 |
| rowSelection | Object | 否 |  | 可选择行的参数配置 |
| showSizeChanger | Boolean |  否  | true | 是否可以改变每页大小 |
| showQuery | Boolean |  否  | true | 是否显示查询、重置等按钮 |
| rowKey  | String，Function | 否 | key |  表格行的key  |
| pageNum | Number | 否 | 1 | 页码 |
| pageSize | Number | 否 | 10 | 页大小 |
| fixedPagination | Boolean | 否 | true | 分页组件是否固定在底部 |
| hasPagination | Boolean | 否 | true | 是否分页 |
| autoQuery | Boolean | 否 | true | 受控组件change事件自动查询 |
| customStorageKey | String | 否 | null | 自定义表格列缓存至本地的key，不传则会通过当前路由名加上一个字符串组成，如果一个页面中有多个s-table组件，请手动传入该字段，否则会出现莫名bug |
| columns | Array | 是 |  | 在ant-design-vue table组件columns原有属性的基础上，加了nofilter、must属性 |
| queryForm | Array | 否 |   | 查询条件相关  |
| alone | Boolean | 否 | false  | 查询、重置等功能按钮是否单独一行  |
| span | Number | 否 | null  | 查询条件中栅格系统col span属性  |
| hasExpand | Boolean | 否 | true | 是否有展开、收拢功能 |
| querySpan | Number | 否 | null  | 查询条件中查询、重置等功能按钮col span属性  |
| expandBoundary | Number | 否 | 6 | 展开收拢功能查询条件数量边界 |
| labelCol | Number | 否 | 6 | 查询表单label占据空间 |
| wrapperCol | Number | 否 | 6 | 查询表单受控组件占据空间 |
| filterColumn | Boolean | 否 | false | 是否支持自定义表格列 |
| beforeSubmit | Function | 否 | null | 表单提交之前的回调，可以对表单的数据就行处理 |
| resultRender | Object | 否 | {success: 'success', total: 'datas.total', records: 'datas.records'} | 表单提交之前的回调，可以对表单的数据就行处理, success成功失败标志位，total后端返回的总条数，records后端返回的数据列表字段 |

##### columns增加的属性
| 属性 | 类型 | 是否必须 |  默认值  | 说明 |
| --- | --- | --- | --- | ---|
| nofilter | Boolean | 否 | false | 为true则此字段不参与过滤 |
| must | Boolean | 否 | false | 为true则此字段是必选项 |

#### queryForm
| 属性 | 类型 | 是否必须 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| type | String | 否 | input | 元素类型 |
| dataIndex | String | 是 |  | 字段名 |
| cb | Function | 否 |  | 受控组件的change事件回调 |
| fetchFn | Function | type为select，且options为空时必传 |  | select options异步获取方法 |
| hasExpand | Boolean | 否 | false | 字段是否参与收拢 |
| wrapperCol | Object | 否 | null | 查询表单受控组件占据空间 |
| formItem | Object | 否 | null | 查询表单a-form-item属性 |
| itemSelf | Object | 否 | null | 查询表单受控组件属性 |

#### 事件
| 属性 | 说明 |
| --- | --- |
| result | 网络请求返回的数据 |

#### 插槽
| 属性 | 说明 |
| --- | --- |
| alert | 显示alert时，该插槽才有效，alert组件自定义功能 |
| formFn | 搜索区域自定义的功能，如新增按钮的功能等 |
| queryFormItem | 自定义查询条件 |