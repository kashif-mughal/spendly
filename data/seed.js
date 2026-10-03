/* AUTO-GENERATED from data/*.json - do not edit by hand.
   Lets the app run straight from the file system (file://), where fetch()
   of local JSON is blocked. Regenerate with: python3 tools/build-seed.py */
window.HEM_SEED = (function () {
  'use strict';
  return {
    settings: {
      "currency": "PKR",
      "currencySymbol": "Rs",
      "locale": "en-PK",
      "appName": "House Expense Manager",
      "defaultYear": 2026,
      "startOfWeek": 1,
      "version": "1.0"
    },
    lists: {
      "types": [
        "Expense",
        "Income",
        "Transfer"
      ],
      "transferCategories": [
        "Account Transfer"
      ],
      "transferSubCategories": [
        "ATM Withdrawal",
        "Savings Deposit",
        "Credit Card Payment",
        "Wallet Top-up",
        "Cash Deposit",
        "Between Accounts",
        "Loan"
      ],
      "paymentMethods": [
        "Cash",
        "Debit Card",
        "Credit Card",
        "Bank Transfer",
        "Mobile Wallet",
        "Cheque",
        "Online Payment"
      ],
      "accountTypes": [
        "Bank",
        "Cash",
        "Credit Card",
        "Mobile Wallet",
        "Savings",
        "Investment",
        "Other"
      ],
      "months": [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
      ]
    },
    categories: {
      "expense": [
        {
          "name": "Housing",
          "subs": [
            "Rent",
            "Mortgage / Installment",
            "Maintenance & Repairs",
            "Society Charges",
            "Property Tax",
            "Furniture",
            "Home Insurance"
          ]
        },
        {
          "name": "Utilities",
          "subs": [
            "Electricity",
            "Gas",
            "Water",
            "Internet",
            "Mobile",
            "TV / Cable",
            "Solar / UPS"
          ]
        },
        {
          "name": "Food & Groceries",
          "subs": [
            "Groceries",
            "Vegetables & Fruits",
            "Meat & Poultry",
            "Dairy & Bakery",
            "Drinking Water",
            "Snacks & Beverages"
          ]
        },
        {
          "name": "Dining Out",
          "subs": [
            "Restaurants",
            "Fast Food",
            "Food Delivery",
            "Cafe & Tea"
          ]
        },
        {
          "name": "Transportation",
          "subs": [
            "Fuel",
            "Car Maintenance",
            "Ride Hailing",
            "Public Transport",
            "Parking & Tolls",
            "Vehicle Insurance",
            "Vehicle Tax / Token"
          ]
        },
        {
          "name": "Household Help",
          "subs": [
            "Maid",
            "Driver",
            "Cook",
            "Guard",
            "Gardener"
          ]
        },
        {
          "name": "Healthcare",
          "subs": [
            "Doctor",
            "Medicines",
            "Lab Tests",
            "Hospital",
            "Dental",
            "Health Insurance"
          ]
        },
        {
          "name": "Education",
          "subs": [
            "School Fees",
            "Tuition",
            "Books & Stationery",
            "Uniform",
            "School Van",
            "Courses"
          ]
        },
        {
          "name": "Personal Care",
          "subs": [
            "Salon / Barber",
            "Cosmetics",
            "Toiletries",
            "Gym / Fitness"
          ]
        },
        {
          "name": "Clothing",
          "subs": [
            "Clothes",
            "Shoes",
            "Accessories",
            "Tailoring"
          ]
        },
        {
          "name": "Kids",
          "subs": [
            "Toys",
            "Baby Care",
            "Activities",
            "Pocket Money"
          ]
        },
        {
          "name": "Entertainment",
          "subs": [
            "Streaming Subscriptions",
            "Movies & Events",
            "Hobbies",
            "Outings",
            "Games"
          ]
        },
        {
          "name": "Shopping & Electronics",
          "subs": [
            "Electronics",
            "Appliances",
            "Home Decor",
            "Kitchenware",
            "Online Shopping"
          ]
        },
        {
          "name": "Travel",
          "subs": [
            "Flights",
            "Hotels",
            "Local Travel",
            "Visa & Documents"
          ]
        },
        {
          "name": "Gifts & Donations",
          "subs": [
            "Gifts",
            "Charity / Sadqa",
            "Zakat",
            "Religious",
            "Weddings & Events"
          ]
        },
        {
          "name": "Financial",
          "subs": [
            "Bank Charges",
            "Loan Repayment",
            "Interest",
            "Insurance Premium",
            "Taxes",
            "Card Fees"
          ]
        },
        {
          "name": "Pets",
          "subs": [
            "Pet Food",
            "Vet",
            "Pet Supplies"
          ]
        },
        {
          "name": "Miscellaneous",
          "subs": [
            "Other",
            "Unplanned",
            "Fines / Penalties"
          ]
        }
      ],
      "income": [
        {
          "name": "Salary",
          "subs": [
            "Basic Salary",
            "Bonus",
            "Allowances",
            "Overtime"
          ]
        },
        {
          "name": "Business",
          "subs": [
            "Sales",
            "Freelance",
            "Consulting"
          ]
        },
        {
          "name": "Investments",
          "subs": [
            "Profit / Interest",
            "Dividends",
            "Capital Gains"
          ]
        },
        {
          "name": "Rental Income",
          "subs": [
            "House Rent",
            "Shop Rent"
          ]
        },
        {
          "name": "Other Income",
          "subs": [
            "Gifts Received",
            "Refunds",
            "Cashback",
            "Sale of Items",
            "Other"
          ]
        }
      ],
      "transfer": [
        {
          "name": "Account Transfer",
          "subs": [
            "ATM Withdrawal",
            "Savings Deposit",
            "Credit Card Payment",
            "Wallet Top-up",
            "Cash Deposit",
            "Between Accounts",
            "Loan"
          ]
        }
      ]
    },
    accounts: [
      {
        "id": "acc_1",
        "name": "HBL",
        "type": "Bank",
        "openingBalance": 322447.0,
        "notes": ""
      },
      {
        "id": "acc_2",
        "name": "Home Account",
        "type": "Cash",
        "openingBalance": 61000.0,
        "notes": ""
      },
      {
        "id": "acc_3",
        "name": "Faysal Bank",
        "type": "Bank",
        "openingBalance": 2437.0,
        "notes": ""
      },
      {
        "id": "acc_4",
        "name": "EasyPaisa",
        "type": "Mobile Wallet",
        "openingBalance": 3780.0,
        "notes": ""
      },
      {
        "id": "acc_5",
        "name": "Factory",
        "type": "Cash",
        "openingBalance": 100000.0,
        "notes": ""
      },
      {
        "id": "acc_6",
        "name": "Kashif",
        "type": "Cash",
        "openingBalance": 15000.0,
        "notes": ""
      },
      {
        "id": "acc_7",
        "name": "Outside",
        "type": "Cash",
        "openingBalance": 0.0,
        "notes": ""
      }
    ],
    templates: [
      {
        "id": "tpl_1",
        "name": "Monthly Salary",
        "type": "Income",
        "category": "Salary",
        "subCategory": "Basic Salary",
        "account": "HBL",
        "toAccount": "",
        "amount": 380000.0,
        "paymentMethod": "Bank Transfer",
        "description": "Monthly salary"
      },
      {
        "id": "tpl_2",
        "name": "House Rent",
        "type": "Expense",
        "category": "Housing",
        "subCategory": "Rent",
        "account": "HBL",
        "toAccount": "",
        "amount": 24000.0,
        "paymentMethod": "Online Payment",
        "description": "Monthly house rent"
      },
      {
        "id": "tpl_3",
        "name": "Electricity Bill",
        "type": "Expense",
        "category": "Utilities",
        "subCategory": "Electricity",
        "account": "HBL",
        "toAccount": "",
        "amount": 0.0,
        "paymentMethod": "Online Payment",
        "description": "Electricity bill"
      },
      {
        "id": "tpl_4",
        "name": "Gas Bill",
        "type": "Expense",
        "category": "Utilities",
        "subCategory": "Gas",
        "account": "HBL",
        "toAccount": "",
        "amount": 0.0,
        "paymentMethod": "Online Payment",
        "description": "Gas bill"
      },
      {
        "id": "tpl_5",
        "name": "Internet Bill",
        "type": "Expense",
        "category": "Utilities",
        "subCategory": "Internet",
        "account": "HBL",
        "toAccount": "",
        "amount": 1000.0,
        "paymentMethod": "Online Payment",
        "description": "Home internet"
      },
      {
        "id": "tpl_6",
        "name": "Mobile Package",
        "type": "Expense",
        "category": "Utilities",
        "subCategory": "Mobile",
        "account": "Mobile Wallet",
        "toAccount": "",
        "amount": 200.0,
        "paymentMethod": "Mobile Wallet",
        "description": "Mobile package"
      },
      {
        "id": "tpl_7",
        "name": "Groceries",
        "type": "Expense",
        "category": "Food & Groceries",
        "subCategory": "Groceries",
        "account": "Home Account",
        "toAccount": "",
        "amount": 0.0,
        "paymentMethod": "Cash",
        "description": "Grocery"
      },
      {
        "id": "tpl_8",
        "name": "Fuel Refill",
        "type": "Expense",
        "category": "Transportation",
        "subCategory": "Fuel",
        "account": "Kashif",
        "toAccount": "",
        "amount": 2000.0,
        "paymentMethod": "Cash",
        "description": "Patrol"
      },
      {
        "id": "tpl_9",
        "name": "School Fee",
        "type": "Expense",
        "category": "Education",
        "subCategory": "School Fees",
        "account": "Home Account",
        "toAccount": "",
        "amount": 500.0,
        "paymentMethod": "Cash",
        "description": "Kids school fee"
      },
      {
        "id": "tpl_10",
        "name": "Tution Fee",
        "type": "Expense",
        "category": "Education",
        "subCategory": "Tuition",
        "account": "Home Account",
        "toAccount": "",
        "amount": 1000.0,
        "paymentMethod": "Cash",
        "description": "Kids tution fee"
      },
      {
        "id": "tpl_11",
        "name": "Cash Withdrawal",
        "type": "Transfer",
        "category": "Account Transfer",
        "subCategory": "ATM Withdrawal",
        "account": "HBL",
        "toAccount": "Home Account",
        "amount": 49000.0,
        "paymentMethod": "Cash",
        "description": "ATM cash withdrawal"
      },
      {
        "id": "tpl_12",
        "name": "Amount Transfer",
        "type": "Transfer",
        "category": "Account Transfer",
        "subCategory": "Wallet Top-up",
        "account": "HBL",
        "toAccount": "EasyPaisa",
        "amount": 0.0,
        "paymentMethod": "Bank Transfer",
        "description": "Top-up mobile wallet"
      },
      {
        "id": "tpl_13",
        "name": "Doodh 4",
        "type": "Expense",
        "category": "Food & Groceries",
        "subCategory": "Dairy & Bakery",
        "account": "Home Account",
        "toAccount": "",
        "amount": 960.0,
        "paymentMethod": "Cash",
        "description": "4 KG doodh"
      },
      {
        "id": "tpl_14",
        "name": "Doodh 2",
        "type": "Expense",
        "category": "Food & Groceries",
        "subCategory": "Dairy & Bakery",
        "account": "Home Account",
        "toAccount": "",
        "amount": 480.0,
        "paymentMethod": "Cash",
        "description": "2 KG doodh"
      },
      {
        "id": "tpl_15",
        "name": "Chingchi",
        "type": "Expense",
        "category": "Transportation",
        "subCategory": "Public Transport",
        "account": "Home Account",
        "toAccount": "",
        "amount": 180.0,
        "paymentMethod": "Cash",
        "description": "Chingchi kiraya"
      },
      {
        "id": "tpl_16",
        "name": "Paani",
        "type": "Expense",
        "category": "Food & Groceries",
        "subCategory": "Drinking Water",
        "account": "Home Account",
        "toAccount": "",
        "amount": 30.0,
        "paymentMethod": "Cash",
        "description": "Paani"
      },
      {
        "id": "tpl_17",
        "name": "Flat Maintenance",
        "type": "Expense",
        "category": "Housing",
        "subCategory": "Society Charges",
        "account": "Home Account",
        "toAccount": "",
        "amount": 3000.0,
        "paymentMethod": "Cash",
        "description": "Flat maintenance"
      },
      {
        "id": "tpl_18",
        "name": "Cylander Refill",
        "type": "Expense",
        "category": "Utilities",
        "subCategory": "Gas",
        "account": "Home Account",
        "toAccount": "",
        "amount": 2000.0,
        "paymentMethod": "Cash",
        "description": "Gas cylander refill"
      },
      {
        "id": "tpl_19",
        "name": "Amount Transfer (Loan)",
        "type": "Transfer",
        "category": "Account Transfer",
        "subCategory": "Loan",
        "account": "HBL",
        "toAccount": "Outside",
        "amount": 0.0,
        "paymentMethod": "Cash",
        "description": "Loan given to"
      },
      {
        "id": "tpl_20",
        "name": "Lunch",
        "type": "Expense",
        "category": "Dining Out",
        "subCategory": "Restaurants",
        "account": "Kashif",
        "toAccount": "",
        "amount": 0.0,
        "paymentMethod": "Cash",
        "description": "Lunch"
      },
      {
        "id": "tpl_21",
        "name": "Snacks Items",
        "type": "Expense",
        "category": "Food & Groceries",
        "subCategory": "Snacks & Beverages",
        "account": "Home Account",
        "toAccount": "",
        "amount": 0.0,
        "paymentMethod": "Cash",
        "description": "Snacks for kids"
      }
    ],
    budget: {
      "Housing": 30000.0,
      "Utilities": 11000.0,
      "Food & Groceries": 30000.0,
      "Dining Out": 9000.0,
      "Transportation": 20000.0,
      "Household Help": 15000.0,
      "Healthcare": 8000.0,
      "Education": 30000.0,
      "Personal Care": 5000.0,
      "Clothing": 8000.0,
      "Kids": 6000.0,
      "Entertainment": 5000.0,
      "Shopping & Electronics": 10000.0,
      "Travel": 5000.0,
      "Gifts & Donations": 5000.0,
      "Financial": 3000.0,
      "Pets": 0.0,
      "Miscellaneous": 3000.0
    },
    transactions: [
      {
        "date": "2026-10-01",
        "template": "House Rent",
        "type": "Expense",
        "category": "Housing",
        "subCategory": "Rent",
        "account": "HBL",
        "toAccount": "",
        "amount": 24000.0,
        "paymentMethod": "Online Payment",
        "description": "Monthly house rent",
        "notes": "",
        "id": "txn_0001"
      },
      {
        "date": "2026-10-01",
        "template": "Electricity Bill",
        "type": "Expense",
        "category": "Utilities",
        "subCategory": "Electricity",
        "account": "HBL",
        "toAccount": "",
        "amount": 3567.0,
        "paymentMethod": "Online Payment",
        "description": "Electricity bill",
        "notes": "",
        "id": "txn_0002"
      },
      {
        "date": "2026-10-01",
        "template": "Gas Bill",
        "type": "Expense",
        "category": "Utilities",
        "subCategory": "Gas",
        "account": "HBL",
        "toAccount": "",
        "amount": 1370.0,
        "paymentMethod": "Online Payment",
        "description": "Gas bill",
        "notes": "",
        "id": "txn_0003"
      },
      {
        "date": "2026-10-01",
        "template": "Cylander Refill",
        "type": "Expense",
        "category": "Utilities",
        "subCategory": "Gas",
        "account": "Home Account",
        "toAccount": "",
        "amount": 2000.0,
        "paymentMethod": "Cash",
        "description": "Gas cylander refill",
        "notes": "",
        "id": "txn_0004"
      },
      {
        "date": "2026-10-01",
        "template": "Groceries",
        "type": "Expense",
        "category": "Food & Groceries",
        "subCategory": "Groceries",
        "account": "Home Account",
        "toAccount": "",
        "amount": 1580.0,
        "paymentMethod": "Cash",
        "description": "Grocery",
        "notes": "",
        "id": "txn_0005"
      },
      {
        "date": "2026-10-01",
        "template": "Groceries",
        "type": "Expense",
        "category": "Food & Groceries",
        "subCategory": "Meat & Poultry",
        "account": "Home Account",
        "toAccount": "",
        "amount": 150.0,
        "paymentMethod": "Cash",
        "description": "1 pao fry fish",
        "notes": "",
        "id": "txn_0006"
      },
      {
        "date": "2026-10-01",
        "template": "Cylander Refill",
        "type": "Expense",
        "category": "Utilities",
        "subCategory": "Gas",
        "account": "Home Account",
        "toAccount": "",
        "amount": 2050.0,
        "paymentMethod": "Cash",
        "description": "Gas cylander refill",
        "notes": "",
        "id": "txn_0007"
      },
      {
        "date": "2026-10-01",
        "template": "",
        "type": "Expense",
        "category": "Dining Out",
        "subCategory": "Restaurants",
        "account": "Kashif",
        "toAccount": "",
        "amount": 50.0,
        "paymentMethod": "Cash",
        "description": "Roti",
        "notes": "",
        "id": "txn_0008"
      },
      {
        "date": "2026-10-01",
        "template": "Fuel Refill",
        "type": "Expense",
        "category": "Transportation",
        "subCategory": "Fuel",
        "account": "Kashif",
        "toAccount": "",
        "amount": 2000.0,
        "paymentMethod": "Cash",
        "description": "Patrol",
        "notes": "",
        "id": "txn_0009"
      },
      {
        "date": "2026-10-02",
        "template": "Doodh 4",
        "type": "Expense",
        "category": "Food & Groceries",
        "subCategory": "Dairy & Bakery",
        "account": "Home Account",
        "toAccount": "",
        "amount": 960.0,
        "paymentMethod": "Cash",
        "description": "4 KG doodh",
        "notes": "",
        "id": "txn_0010"
      },
      {
        "date": "2026-10-02",
        "template": "Paani",
        "type": "Expense",
        "category": "Food & Groceries",
        "subCategory": "Drinking Water",
        "account": "Home Account",
        "toAccount": "",
        "amount": 30.0,
        "paymentMethod": "Cash",
        "description": "Paani",
        "notes": "",
        "id": "txn_0011"
      },
      {
        "date": "2026-10-02",
        "template": "Lunch",
        "type": "Expense",
        "category": "Dining Out",
        "subCategory": "Restaurants",
        "account": "Kashif",
        "toAccount": "",
        "amount": 380.0,
        "paymentMethod": "Cash",
        "description": "Lunch",
        "notes": "",
        "id": "txn_0012"
      },
      {
        "date": "2026-10-02",
        "template": "",
        "type": "Expense",
        "category": "Personal Care",
        "subCategory": "Salon / Barber",
        "account": "Kashif",
        "toAccount": "",
        "amount": 350.0,
        "paymentMethod": "Cash",
        "description": "Baal katwai kay",
        "notes": "",
        "id": "txn_0013"
      },
      {
        "date": "2026-10-02",
        "template": "Chingchi",
        "type": "Expense",
        "category": "Transportation",
        "subCategory": "Public Transport",
        "account": "Home Account",
        "toAccount": "",
        "amount": 180.0,
        "paymentMethod": "Cash",
        "description": "Chingchi kiraya",
        "notes": "",
        "id": "txn_0014"
      },
      {
        "date": "2026-10-02",
        "template": "Groceries",
        "type": "Expense",
        "category": "Food & Groceries",
        "subCategory": "Groceries",
        "account": "Home Account",
        "toAccount": "",
        "amount": 410.0,
        "paymentMethod": "Cash",
        "description": "Kaleji, dahi",
        "notes": "",
        "id": "txn_0015"
      },
      {
        "date": "2026-10-02",
        "template": "Snacks Items",
        "type": "Expense",
        "category": "Food & Groceries",
        "subCategory": "Snacks & Beverages",
        "account": "Home Account",
        "toAccount": "",
        "amount": 80.0,
        "paymentMethod": "Cash",
        "description": "Snacks for kids",
        "notes": "",
        "id": "txn_0016"
      }
    ]
  };
}());
