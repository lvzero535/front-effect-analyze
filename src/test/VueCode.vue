<template>
  <div class="role-wrap">
    <XTable @register="register" :fetch="getRoleData">
      <template #name="{ value, record }">
        <Button
          type="link"
          :disabled="isAdmin(record)"
          @click="editRoleHandler(record as RoleModel)"
          >{{ value }}</Button
        >
      </template>
      <template #options="{ record }">
        <Popconfirm
          title="确定删除角色？"
          @confirm="onDelete([(record as RoleModel).id!])"
        >
          <a v-if="!isAdmin(record)">删除</a>
          <span v-else>-</span>
        </Popconfirm>
      </template>
    </XTable>
  </div>
</template>
<script lang="ts" setup>

import Form from './Form.vue';

const { open } = useModal();
const searchContent = ref('');
const isAdmin = (record: RoleModel) => record.value === 'admin';
const { register, loadData } = useTable({
  columns: [
    {
      title: '角色名称',
      dataIndex: 'name',
      width: 200,
      cellContent: 'name',
    },
    {
      title: '角色值',
      dataIndex: 'value',
      width: 100,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true,
      minWidth: 200,
    },
    {
      title: '创建时间',
      dataIndex: 'createAt',
      ellipsis: true,
      minWidth: 50,
    },
    {
      title: '操作',
      dataIndex: 'options',
      width: 100,
      fixed: 'right',
      cellContent: 'options',
    },
  ],
  selection: {
    disableSelect: isAdmin,
  },
  toolbar: {
    search: {
      placeholder: '请输入角色名',
      onSearch: (value: string) => {
        searchContent.value = value;
        loadData();
      },
    },
    buttons: [
      {
        xType: XTypeButtonEnum.XType_Refresh,
      },
      {
        xType: XTypeButtonEnum.XType_Add,
        onClick: () => {
          addRoleHandler();
        },
      },
      {
        xType: XTypeButtonEnum.XType_Delete,
        selectMust: true,
        callback: (ids: SafeAny[]) => {
          onDelete(ids);
        },
      },
    ],
  },
});

const addRoleHandler = () => {
  openRoleModal('添加角色');
};
const editRoleHandler = async (RoleInfo: RoleModel) => {
  const resp = await getRoleById(RoleInfo.id!);
  if (resp.success) {
    openRoleModal('编辑角色', resp.data);
  }
};

const openRoleModal = (title: string, roleInfo?: RoleModel) => {
  const formRef = ref<InstanceType<typeof Form>>();
  open({
    title,
    confirmLoading: true,
    content: h(Form),
    contentProps: {
      ref: formRef,
      roleInfo,
    },
    onOk: async () => {
      const result = await formRef.value?.onSubmit();
      if (result) {
        loadData();
      }
      return result;
    },
  });
};

const onDelete = async (ids: number[]) => {
  const resp = await deleteRole(ids);
  if (resp.success) {
    loadData();
  }
};

async function getRoleData(pageQuery: PageQuery) {
  const resp = await getRoleList({
    ...pageQuery,
    search: searchContent.value,
  });
  return resp.data;
}
</script>
<style lang="less" scoped>
.role-wrap {
  height: 100%;
}
</style>
