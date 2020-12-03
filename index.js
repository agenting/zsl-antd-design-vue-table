import T from 'ant-design-vue/es/table/Table';
import APagination from 'ant-design-vue/es/pagination/Pagination';
import QModal from '../Modal/Modal';
import get from 'lodash.get';
import classnames from './index.module.less';
import cloneDeep from 'lodash.clonedeep';

function setSelectOptionsUtil (name) {
  return `selectOptions${name.charAt(0).toUpperCase()}${name.slice(1)}Item`;
}

const inputTimeOutTime = 1000; // input输入框输入内容后延迟请求数据时间

export default {
  name: 'STable',
  data () {
    this.timedId = null;
    this.resourceColumns = []; // 源数据
    return {
      needTotalList: [],

      selectedRows: [],
      selectedRowKeys: [],

      localLoading: false,
      localDataSource: [],
      localPagination: Object.assign({
        showQuickJumper: true,
        showSizeChanger: true
      }, this.pagination),
      localScroll: { y: 0 },
      // localScroll: { x: 0, y: 0 },
      expand: true,
      dynamicProperty: {},
      form: this.$form.createForm(this),
      localColumns: [],
      checkedList: [], // 自定义列checkbox列表
      dropdownVisible: false // 自定义列下拉框是否显示
    };
  },
  components: {
    APagination,
    QModal
  },
  props: Object.assign({}, T.props, {
    resultRender: {
      type: Object,
      default: () => {
        return {
          success: 'success',
          total: 'datas.total',
          records: 'datas.records'
        }
      }
    },
    rowKey: {
      type: [String, Function],
      default: 'key'
    },
    data: {
      type: Function,
      required: true
    },
    pageNum: {
      type: Number,
      default: 1
    },
    pageSize: {
      type: Number,
      default: 10
    },
    showSizeChanger: {
      type: Boolean,
      default: true
    },
    size: {
      type: String,
      default: 'default'
    },
    alert: {
      type: [Object, Boolean],
      default: null
    },
    rowSelection: {
      type: Object,
      default: null
    },
    /** @Deprecated */
    showAlertInfo: {
      type: Boolean,
      default: false
    },
    showPagination: {
      type: String | Boolean,
      default: 'auto'
    },
    showQuery: {
      type: Boolean,
      default: true
    },
    fixedPagination: {
      type: Boolean,
      default: true
    },
    /**
     * enable page URI mode
     *
     * e.g:
     * /users/1
     * /users/2
     * /users/3?queryParam=test
     * ...
     */
    span: {
      type: Number,
      default: 6
    },
    querySpan: Number,
    alone: {
      type: Boolean,
      default: false
    },
    hasPagination: {
      type: Boolean,
      default: true
    },
    pageURI: {
      type: Boolean,
      default: false
    },
    customScroll: {
      type: Boolean,
      default: false
    },
    /* -------查询条件相关--------- */
    queryForm: { // 查询条件
      type: Array
    },
    autoQuery: { // 受控组件change事件自动查询
      type: Boolean,
      default: true
    },
    // 是否有展开、收拢功能
    hasExpand: {
      type: Boolean,
      default: true
    },
    // 展开收拢功能查询条件数量边界
    expandBoundary: {
      type: Number,
      default: 8
    },
    labelCol: { // 查询表单label占据空间
      type: Number,
      default: 8
    },
    wrapperCol: { // 查询表单受控组件占据空间
      type: Number,
      default: 16
    },
    averageDistribution: { // 查询表单受控组件是否平均分配空间，如果查询条件超过一行建议设置为true
      type: Boolean,
      default: true
    },
    filterColumn: { // 是否可以自定义列
      type: Boolean,
      default: true
    },
    customStorageKey: {
      type: String,
      default: null
    },
    beforeSubmit: Function
  }),
  watch: {
    'localPagination.current' (val) {
      this.pageURI && this.$router.push({
        ...this.$route,
        name: this.$route.name,
        params: Object.assign({}, this.$route.params, {
          current: val
        })
      });
      // change pagination, reset total data
      this.needTotalList = this.initTotalList(this.columns);
      this.selectedRowKeys = [];
      this.selectedRows = [];
    },
    pageNum (val) {
      Object.assign(this.localPagination, {
        current: val
      });
    },
    pageSize (val) {
      Object.assign(this.localPagination, {
        pageSize: val
      });
    },
    showSizeChanger (val) {
      Object.assign(this.localPagination, {
        showSizeChanger: val
      });
    }
  },
  created () {
    const { current } = this.$route.params;
    const localPageNum = this.pageURI && (current && parseInt(current)) || this.pageNum;
    this.localPagination = ['auto', true].includes(this.showPagination) && Object.assign({}, this.localPagination, {
      current: localPageNum,
      pageSize: this.pageSize,
      showSizeChanger: this.showSizeChanger
    }) || false;
    this.needTotalList = this.initTotalList(this.columns);

    // 自定义列逻辑
    if (this.filterColumn) {
      this.customFilterColumn();
    } else {
      this.localColumns = this.$props.columns;
    }
    this.bindDropdownHideEvent();
  },
  beforeDestroy () {
    this.unBindDropdownHideEvent();
  },
  async mounted () {
    await this.$nextTick();
    const bodyRect = document.body.getBoundingClientRect();
    const thisRect = this.$el.getBoundingClientRect();
    const y = bodyRect.height - thisRect.y;
    this.localScroll = {
      y: y < 500 ? 500 : y
    };
    // this.localScroll = {
    //   x: thisRect.width,
    //   y: y < 500 ? 500 : y
    // };
    this.loadData();
  },
  methods: {
    bindDropdownHideEvent () {
      window.addEventListener('click', this.hideEvent);
    },
    unBindDropdownHideEvent () {
      window.removeEventListener('click', this.hideEvent);
    },
    // 获取页面table自定义列缓存keys
    getPageTableCustomColumnsStorage () {
      if (this.customStorageKey) {
        return this.customStorageKey;
      }
      return `${this.$route.name}_page_table_custom_columns`;
    },
    hideEvent () {
      this.dropdownVisible = false;
    },
    customFilterColumn () {
      const localColumns = cloneDeep(this.$props.columns);
      const resourceColumns = cloneDeep(localColumns);
      localColumns.map((column, index) => {
        if (!column.nofilter) {
          column.label = column.title;
          column.value = column.dataIndex;
          resourceColumns[index].label = resourceColumns[index].title;
          resourceColumns[index].value = resourceColumns[index].dataIndex;
          if (column.must) {
            column.disabled = true;
            resourceColumns[index].disabled = true;
          }
        } else {
          localColumns.splice(index, 1);
          resourceColumns.splice(index, 1);
        }
      });
      this.resourceColumns = resourceColumns;
      const storageColumns = this.$storage.get(this.getPageTableCustomColumnsStorage());
      if (storageColumns && storageColumns instanceof Array) {
        const tempA = [];
        storageColumns.map(colu => {
          tempA.push(cloneDeep(localColumns.find(lc => lc.dataIndex === colu)));
        });
        this.$props.columns.map(item => {
          if (item.nofilter) {
            tempA.push(cloneDeep(item));
          }
        });
        this.localColumns = tempA;
        this.checkedList = storageColumns;
      } else {
        this.localColumns = localColumns;
        const arr = [];
        localColumns.map((column, index) => {
          if (!column.nofilter) {
            arr.push(column.dataIndex);
          }
        });
        this.checkedList = arr;
      }
    },
    /**
     * 表格重新加载方法
     * 如果参数为 true, 则强制刷新到第一页
     * @param Boolean bool
     */
    refresh (bool = false) {
      bool && (this.localPagination = Object.assign({}, {
        current: 1, pageSize: this.pageSize
      }));
      this.loadData();
    },
    /**
     * 加载数据方法
     * @param {Object} pagination 分页选项器
     * @param {Object} filters 过滤条件
     * @param {Object} sorter 排序条件
     */
    async loadData (pagination, filters, sorter) {
      this.localLoading = true;
      const { hasPagination } = this;
      const p = hasPagination ? {
        pageNum: (pagination && pagination.current) ||
          this.showPagination && this.localPagination.current || this.pageNum,
        pageSize: (pagination && pagination.pageSize) ||
          this.showPagination && this.localPagination.pageSize || this.pageSize
      } : {}
      const sortField = (sorter && sorter.field && {
        sortField: sorter.field
      }) || {};
      const sortOrder = (sorter && sorter.order && {
        sortOrder: sorter.order
      }) || {};
      const parameter = Object.assign(p, sortField, sortOrder, {
        ...filters
      });
      let flag = false; // 是否发起网络请求标志位
      this.form.validateFields((err, values) => {
        if (!err) {
          let value_ = values;
          if (this.beforeSubmit) {
            value_ = this.beforeSubmit(values)
          }
          for (const key in value_) {
            if (!value_[key] && value_[key] !== 0) {
              delete value_[key]
            }
          }
          flag = true;
          return Object.assign(parameter, value_);
        } else {
          flag = false;
        }
      });
      if (!flag) {
        this.localLoading = false;
        return;
      }
      const result = this.data(parameter);
      // 对接自己的通用数据接口需要修改下方代码中的 r.pageNo, r.totalCount, r.data
      // eslint-disable-next-line
      if ((typeof result === 'object' || typeof result === 'function') && typeof result.then === 'function') {
        const resultRender = this.resultRender
        const resultRenderSuccess = resultRender.success
        const resultRenderTotal = resultRender.total.split('.')
        const resultRenderRecords = resultRender.records.split('.')
        const r = await result
        if (r[resultRenderSuccess]) {
          let total = cloneDeep(r)
          resultRenderTotal.forEach(item => {
            total = total[item]
          })
          let records = cloneDeep(r)
          resultRenderRecords.forEach(item => {
            records = records[item]
          })
          if (hasPagination) {
            this.localPagination = this.showPagination && Object.assign({}, this.localPagination, {
              current: (pagination && pagination.current) || this.localPagination.current,
              total, // 返回结果中的总记录数
              showSizeChanger: this.showSizeChanger,
              pageSize: (pagination && pagination.pageSize) ||
              this.localPagination.pageSize
            }) || false;
            // 为防止删除数据后导致页面当前页面数据长度为 0 ,自动翻页到上一页
            if (r[resultRenderSuccess] && !records.length && this.showPagination && this.localPagination.current > 1) {
              this.localPagination.current--;
              this.loadData();
              return;
            }
          }
          // 这里用于判断接口是否有返回 r.totalCount 且 this.showPagination = true 且 pageNo 和 pageSize 存在 且 totalCount 小于等于 pageNo * pageSize 的大小
          // 当情况满足时，表示数据不满足分页大小，关闭 table 分页功能
          try {
            if ((['auto', true].includes(this.showPagination) && hasPagination && total <= (this.localPagination.current * this.localPagination.pageSize))) {
              this.localPagination.hideOnSinglePage = true;
            }
          } catch (e) {
            this.localPagination = false;
          }
          this.$emit('result', r);
          this.localDataSource = records; // 返回结果中的数组数据
          this.localLoading = false;
        } else {
          this.localLoading = false;
        }
      }
    },
    initTotalList (columns) {
      const totalList = [];
      columns && columns instanceof Array && columns.forEach(column => {
        if (column.needTotal) {
          totalList.push({
            ...column,
            total: 0
          });
        }
      });
      return totalList;
    },
    /**
     * 用于更新已选中的列表数据 total 统计
     * @param selectedRowKeys
     * @param selectedRows
     */
    updateSelect (selectedRowKeys, selectedRows) {
      this.selectedRows = selectedRows;
      this.selectedRowKeys = selectedRowKeys;
      const list = this.needTotalList;
      this.needTotalList = list.map(item => {
        return {
          ...item,
          total: selectedRows.reduce((sum, val) => {
            const total = sum + parseInt(get(val, item.dataIndex));
            return isNaN(total) ? 0 : total;
          }, 0)
        };
      });
    },
    /**
     * 清空 table 已选中项
     */
    clearSelected () {
      if (this.rowSelection) {
        this.rowSelection.onChange([], []);
        this.updateSelect([], []);
      }
    },
    /**
     * 处理交给 table 使用者去处理 clear 事件时，内部选中统计同时调用
     * @param callback
     * @returns {*}
     */
    renderClear (callback) {
      if (this.selectedRowKeys.length <= 0) return null;
      return (
        <a style="margin-left: 24px" onClick={() => {
          callback();
          this.clearSelected();
        }}>清空</a>
      );
    },
    renderAlert () {
      // 绘制统计列数据
      const needTotalItems = this.needTotalList.map((item) => {
        return (<span style="margin-right: 12px">
          {item.title}总计 <a style="font-weight: 600">{!item.customRender ? item.total : item.customRender(item.total)}</a>
        </span>);
      });

      // 绘制 清空 按钮
      const clearItem = (typeof this.alert.clear === 'boolean' && this.alert.clear) ? (
        this.renderClear(this.clearSelected)
      ) : (this.alert !== null && typeof this.alert.clear === 'function') ? (
        this.renderClear(this.alert.clear)
      ) : null;

      // 绘制 alert 组件
      return (
        <a-alert showIcon={true} style="margin-bottom: 16px">
          <template slot="message">
            <span style="margin-right: 12px">已选择: <a style="font-weight: 600">{this.selectedRows.length}</a>项</span>
            {needTotalItems}
            {clearItem}
            {this.$scopedSlots.alert ? this.$scopedSlots.alert() : null}
          </template>
        </a-alert>
      );
    },
    // 查询表单执行
    handleSearch () {
      this.refresh(true);
    },
    // 展开、收拢方法
    toggle () {
      this.expand = !this.expand;
    },
    // 重置查询表单
    resetForm () {
      this.form.resetFields();
      this.handleSearch();
    },
    // 延迟查询
    setTimeOutControlledComponentChange () {
      window.clearTimeout(this.timedId);
      this.timedId = window.setTimeout(this.controlledComponentChange, inputTimeOutTime);
    },
    async controlledComponentChange () {
      const { autoQuery } = this;
      if (autoQuery) {
        await this.$nextTick();
        this.handleSearch();
      }
    },
    // 动态设置响应式变量
    dynamicSetProperty (key, value) {
      this.$set(this.dynamicProperty, key, value);
    },
    // 设置属性工具方法
    setPropertyUtil (item) {
      if (!item.hasRequest) {
        this.dynamicSetProperty(setSelectOptionsUtil(item.dataIndex), []);
        item.hasRequest = true;
        this.fetchFnUtil(item);
      }
      return this.dynamicProperty[setSelectOptionsUtil(item.dataIndex)];
    },
    // 获取options工具方法
    getOptionsUtil (item) {
      const options = [];
      if (item?.itemSelf?.options) {
        options.push(...item.itemSelf.options);
      } else {
        options.push(...this.setPropertyUtil(item));
      }
      return options;
    },
    // 请求接口
    async fetchFnUtil (item) {
      if (!item.fetchFn) {
        throw Error(`${item.dataIndex}必须传一个异步请求方法`);
      }
      const result = await item.fetchFn();
      console.log('result', result);
      if (result.success) {
        this.dynamicProperty[setSelectOptionsUtil(item.dataIndex)] = result.datas;
      }
    },
    // 渲染查询form组件
    renderSearchForm () {
      const { queryForm, expand, expandBoundary, filterColumn, showQuery } = this;
      let queryCount = 0;
      queryForm && queryForm.map(item => {
        queryCount++;
      });
      const functionContent = <div>
        {
          this.$scopedSlots['formFn'] ? this.$scopedSlots['formFn']() : null
        }
        <a-button type="primary" style="margin-left: 8px" onClick={this.handleSearch}>
          <a-icon type="search" />
          查询
        </a-button>
        <a-button style="margin-left: 8px" onClick={this.resetForm}>
          <a-icon type="reload" />
          重置
        </a-button>
        {
          filterColumn ? <a-dropdown visible={this.dropdownVisible} trigger={['click']}>
            <a-button class="ant-dropdown-link" onClick={(e) => {
              e.stopPropagation();
              this.dropdownVisible = true;
            }} style="margin-left: 8px">
              筛选列<a-icon type="hdd" />
            </a-button>
            <a-card slot="overlay" onClick={(e) => {
              e.stopPropagation();
            }} style="width: 150px;padding: 10px;">
              <a-checkbox-group
                value={this.checkedList}
                options={this.resourceColumns}
                onChange={this.localFilterColumnChange}
              />
            </a-card>
          </a-dropdown> : null
        }
        {
          this.hasExpand && queryCount > expandBoundary ? <a style="margin-left: 8px; font-size: 12px;" onClick={this.toggle}>
            {expand ? '展开' : '收拢'} <a-icon type={expand ? 'down' : 'up'} />
          </a> : null
        }
      </div>
      return (
        showQuery && <a-form
          form={this.form}
          label-col={{ span: this.labelCol }}
          wrapper-col={{ span: this.wrapperCol }}
          style="background: #ffffff; padding: 20px; margin-bottom: 20px;"
          onSubmit={this.handleSearch}
        >
          <a-row type="flex" align="middle">
            {
              queryForm && queryForm.map((item, index) => this.renderContainer(item, index))
            }
            {
              this.$scopedSlots['queryFormItem'] ? this.$scopedSlots['queryFormItem']() : null
            }
            {
              !this.alone && <a-col span={this.querySpan || this.span}>{functionContent}</a-col>
            }
          </a-row>
          {
            this.alone && <a-row type="flex" justify="end" align="middle" style="margin-top: 10px;">
            {functionContent}
          </a-row>
          }
        </a-form>
      );
    },
    // 渲染查询条件
    renderContainer (item, index) {
      const { expand, hasExpand, expandBoundary } = this;
      let show = null;
      if (hasExpand) {
        if (expand) {
          if (index <= expandBoundary - 1) {
            show = 'block';
          } else {
            show = 'none';
          }
        } else {
          show = 'block';
        }
      } else {
        show = 'block';
      }
      const renderFormItem = () => {
        const props = Object.assign(cloneDeep(item.formItem || {}), {
          colon: false
        });
        return <a-form-item
          class={classnames['ant-form-item']}
          { ...{ props } }
        >
          {this.renderItem(item)}
        </a-form-item>;
      };
      return <a-col
        key={index}
        span={item?.formItem?.span || this.span}
        style={{ display: show }}
      >
        {renderFormItem()}
      </a-col>;
    },
    // 根据类型渲染查询条件组件
    renderItem (item) {
      switch (item.type) {
      case 'input':
        return this.renderInput(item); // input输入
      case 'select':
        return this.renderSelect(item); // select选择
      case 'rangePicker':
        return this.renderRangePicker(item); // 时间范围
      case 'cascader':
        return this.renderCascader(item); // 级联
      default:
        return this.renderInput(item);
      }
    },
    // 渲染input查询组件
    renderInput (item) {
      const props = Object.assign(cloneDeep(item.itemSelf || {}), {
        allowClear: true,
        placeholder: item?.itemSelf?.placeholder || `请输入${item?.formItem?.label}`
      });
      return <a-input
        v-decorator={[ item.dataIndex, item?.itemSelf?.decoratorOptions || {} ]}
        {...{ props }}
        onChange={item?.itemSelf?.cb || this.setTimeOutControlledComponentChange}
      />;
    },
    // 渲染时间范围条件组件
    renderRangePicker (item) {
      const dateFormat = item.dateFormat || 'YYYY/MM/DD HH:mm:ss';
      const props = Object.assign({
        format: dateFormat,
        allowClear: true
        // placeholder: item?.itemSelf?.placeholder || `请输入${item?.formItem?.label}` // 去掉错误提示placeholder
      }, cloneDeep(item.itemSelf || {}));
      return <a-range-picker
        v-decorator={[ item.dataIndex, item?.itemSelf?.decoratorOptions || {} ]}
        {...{ props }}
        onChange={item.cb || this.setTimeOutControlledComponentChange}
      />;
    },
    // 渲染select查询组件
    renderSelect (item) {
      const options = this.getOptionsUtil(item);
      const props = Object.assign({
        allowClear: true,
        options,
        placeholder: item?.itemSelf?.placeholder || `请选择${item?.formItem?.label}`
      }, cloneDeep(item.itemSelf || {}));
      return <a-select
        v-decorator={[ item.dataIndex, item?.itemSelf?.decoratorOptions || {} ]}
        {...{ props }}
        onChange={item?.itemSelf?.cb || this.setTimeOutControlledComponentChange}
      >
        {
          options.map(option => <a-select-option value={option.value}>
            {option.label}
          </a-select-option>)
        }
      </a-select>;
    },
    renderCascader (item) {
      const options = this.getOptionsUtil(item);
      const props = Object.assign({
        allowClear: true,
        options,
        placeholder: item?.itemSelf?.placeholder || `请选择${item?.formItem?.label}`
      }, cloneDeep(item.itemSelf || {}));
      return <a-cascader
          v-decorator={[ item.dataIndex, item?.itemSelf?.decoratorOptions || {} ]}
          {...{ props }}
          onChange={item?.itemSelf?.change || this.setTimeOutControlledComponentChange}>
        </a-cascader>;
    },
    // 自定义列checkbox change事件
    localFilterColumnChange (checkedValue) {
      this.checkedList = checkedValue;
      const { resourceColumns, customStorageKey } = this;
      const arr = [];
      const key = customStorageKey || this.getPageTableCustomColumnsStorage();
      this.$storage.set(key, checkedValue);
      checkedValue.map(c => {
        const cc = resourceColumns.find(column => column.dataIndex === c);
        arr.push(cloneDeep(cc));
      });
      this.$props.columns.map(item => {
        if (item.nofilter) {
          arr.push(cloneDeep(item));
        }
      });
      this.localColumns = arr;
    }
  },
  render () {
    const props = {};
    const localKeys = Object.keys(this.$data);
    const showAlert = (typeof this.alert === 'object' && this.alert !== null && this.alert.show) && typeof this.rowSelection.selectedRowKeys !== 'undefined' || this.alert;
    const fixedPagination = this.$props.fixedPagination;
    const { hasPagination } = this;
    Object.keys(T.props).forEach(k => {
      const localKey = `local${k.substring(0, 1).toUpperCase()}${k.substring(1)}`;
      if (localKeys.includes(localKey)) {
        props[k] = this[localKey];
        return props[k];
      }
      if (k === 'rowSelection') {
        if (showAlert && this.rowSelection) {
          // 如果需要使用alert，则重新绑定 rowSelection 事件
          props[k] = {
            ...this.rowSelection,
            selectedRows: this.selectedRows,
            selectedRowKeys: this.selectedRowKeys,
            onChange: (selectedRowKeys, selectedRows) => {
              this.updateSelect(selectedRowKeys, selectedRows);
              typeof this[k].onChange !== 'undefined' && this[k].onChange(selectedRowKeys, selectedRows);
            }
          };
          return props[k];
        } else if (!this.rowSelection) {
          // 如果没打算开启 rowSelection 则清空默认的选择项
          props[k] = null;
          return props[k];
        }
      }
      this[k] && (props[k] = this[k]);
      return props[k];
    });
    if (!this.$props.customScroll) {
      if (this.localScroll) {
        props.scroll = this.localScroll;
      }
    }
    if (hasPagination) {
      if (fixedPagination) {
        props.pagination = false;
      }
    } else {
      props.pagination = false;
    }
    if (props.bordered === undefined) {
      props.bordered = true;
    }
    const table = (
      <a-table style="margin-bottom: 60px;" {...{ props, scopedSlots: { ...this.$scopedSlots } }} columns={this.localColumns} onChange={this.loadData}
        onExpand={ (expanded, record) => { this.$emit('expand', expanded, record); } }>
        { Object.keys(this.$slots).map(name => (<template slot={name}>{this.$slots[name]}</template>)) }
      </a-table>
    );
    const localPagination = this.localPagination;
    const pagination = (
      <a-pagination
        style="position: fixed; bottom: 10px; right: 10px; background: #fff;"
        {...{ props: localPagination } }
        onShowSizeChange={async (current, pageSize) => {
          const { localPagination } = this;
          localPagination.pageSize = pageSize;
          localPagination.current = 1;
          this.localPagination = localPagination;
          await this.$nextTick();
          this.loadData();
        }}
        onChange={async (page, pageSize) => {
          const p = this.localPagination;
          p.current = page;
          p.pageSize = pageSize;
          this.localPagination = p;
          await this.$nextTick();
          this.refresh();
        }}>
      </a-pagination>
    );

    return (
      <div class="table-wrapper">
        { this.renderSearchForm() }
        { showAlert ? this.renderAlert() : null }
        { table }
        {fixedPagination ? hasPagination && pagination : null}
      </div>
    );
  }
};
