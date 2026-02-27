// 临时替换 main 函数
exports.main = async (event, context) => {
  try {
    console.log('=== 基础连接测试 ===');
    console.log('环境变量:', process.env);
    
    // 测试数据库连通性
    const test = await db.collection('workers').count();
    console.log('数据库连通性测试成功，总数:', test.total);
    
    return {
      success: true,
      message: '基础连接正常',
      totalWorkers: test.total
    };
  } catch (error) {
    console.error('基础连接失败:', error);
    return { success: false, error: error.message };
  }
};