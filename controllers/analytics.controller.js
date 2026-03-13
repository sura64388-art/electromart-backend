import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
export const getAnalyticsData = async () => {
  const totalUsers = await User.countDocuments();
  const totalProducts = await Product.countDocuments();


  const totalSales = await Order.countDocuments({
    orderStatus: { $ne: "CANCELLED" },
  });


  const revenueAgg = await Order.aggregate([
    {
      $match: {
        paymentStatus: "PAID",
        orderStatus: { $ne: "CANCELLED" },
        refundStatus: { $in: ["NONE", null] },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
      },
    },
  ]);

  const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

  // Order Status Counts
  const statusesAgg = await Order.aggregate([
    {
      $group: {
        _id: "$orderStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  const statuses = {
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };

  statusesAgg.forEach((status) => {
    if (status._id === "PLACED" || status._id === "CONFIRMED") {
      statuses.pending += status.count;
    } else if (status._id === "PACKED" || status._id === "OUT_FOR_DELIVERY") {
      statuses.processing += status.count;
    } else if (status._id === "SHIPPED") {
      statuses.shipped += status.count;
    } else if (status._id === "DELIVERED") {
      statuses.delivered += status.count;
    } else if (status._id === "CANCELLED") {
      statuses.cancelled += status.count;
    }
  });

  // Low Stock Alert
  const lowStockProducts = await Product.find({ stock: { $lt: 20 } })
    .select("name stock price image category")
    .sort({ stock: 1 })
    .limit(10)
    .lean();

  // Top Selling Products
  const topSellingProducts = await Order.aggregate([
    { $match: { orderStatus: { $ne: "CANCELLED" } } },
    { $unwind: "$products" },
    {
      $group: {
        _id: "$products.product",
        totalQuantitySold: { $sum: "$products.quantity" },
        totalRevenue: { $sum: { $multiply: ["$products.quantity", "$products.price"] } },
      },
    },
    { $sort: { totalQuantitySold: -1 } },
    { $limit: 8 },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    { $unwind: "$productDetails" },
    {
      $project: {
        _id: 1,
        totalQuantitySold: 1,
        totalRevenue: 1,
        name: "$productDetails.name",
        image: "$productDetails.image",
        price: "$productDetails.price",
        stock: "$productDetails.stock",
        category: "$productDetails.category",
      },
    },
  ]);

  return {
    users: totalUsers,
    products: totalProducts,
    totalSales,
    totalRevenue,
    statuses,
    lowStockProducts,
    topSellingProducts,
  };
};


export const getDailySalesData = async (startDate, endDate) => {
  try {
    const dailySalesData = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
          orderStatus: { $ne: "CANCELLED" },
          refundStatus: { $in: ["NONE", null] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          sales: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dateArray = getDatesInRange(startDate, endDate);

    return dateArray.map((date) => {
      const foundData = dailySalesData.find(
        (item) => item._id === date
      );

      return {
        name: date,
        sales: foundData?.sales || 0,
        revenue: foundData?.revenue || 0,
      };
    });
  } catch (error) {
    throw error;
  }
};

function getDatesInRange(startDate, endDate) {
  const dates = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}
