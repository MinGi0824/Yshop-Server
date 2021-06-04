var express = require('express');
var app = express();
const bodyParser = require('body-parser');

//session
var session = require('express-session');
var FileStore = require('session-file-store')(session);
const sessionkey = require("./session_key");

//s3_image_upload
const s3 = require('./s3.config');
const multer = require('multer');
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });

//customer_file
const GetStoreInfo = require('./customer/util/storeInfo');
const GetProductList = require('./customer/util/productList');
const GetProductInfo = require('./customer/util/productInfo');
const Login_process = require('./customer/util/login_process');
const Reg_process = require('./customer/util/reg_process');
const Customer_CheckID = require('./customer/util/customer_checkID');
const Customer_CheckPhone = require('./customer/util/customer_checkphone');
const Customer_CheckEmail = require('./customer/util/customer_checkEmail');

//seller_file
const join = require('./sellers/dist/js/join');
const login = require('./sellers/dist/js/login');
const getProductList = require('./sellers/dist/js/getProductList');
const registerProduct = require('./sellers/dist/js/registerProduct');
const deleteProduct = require('./sellers/dist/js/deleteProduct');
const getCategory = require('./sellers/dist/js/getCategory');
const registerCategory = require('./sellers/dist/js/registerCategory');
const deleteCategory = require('./sellers/dist/js/deleteCategory');
const getBenefitList = require('./sellers/dist/js/getBenefitList');
const registerBenefit = require('./sellers/dist/js/registerBenefit');
const deleteBenefit = require('./sellers/dist/js/deleteBenefit');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static('customer/public'));             //customer_static
app.use(express.static(__dirname + '/sellers/dist'));  //seller_static

app.use(session({
    secret: sessionkey,
    resave: false,
    saveUninitialized: true,
    store: new FileStore(),
    cookie: {
        maxAge: 60 * 60 * 1000
    },
    rolling: true
}))


//Routing_customer

app.get('/customer/:shopURL/logout_process', function (req, res) {
    req.session.destroy();
    return res.redirect('/customer/' + req.params.shopURL);
})

app.get('/customer/:shopURL', function (req, res) {
    // 메인 페이지
    GetStoreInfo(req.params.shopURL, req.params.shopURL, (error, { storeinfo, category }) => {
        GetProductList(req.params.shopURL, (error, { productlist }) => {
            if (error)
                return res.send({ error });

            var idxURL = (req.params.shopURL).toString();
            return res.render('./customer/index.ejs', {
                categoryInfo: category,
                storeInfo: storeinfo,
                productList: productlist,
                indexURL: idxURL,
                loginInfo: req.session.userID
            });
        })
    });
});

app.get('/customer/:shopURL/product/:productPK', function (req, res) {
    // 상품 상세보기
    GetStoreInfo(req.params.shopURL, req.params.shopURL, (error, { storeinfo, category }) => {
        GetProductInfo(req.params.shopURL, req.params.productPK, (error, { product, image, option }) => {
            if (error)
                return res.send({ error });

            var idxURL = (req.params.shopURL).toString();
            console.log(category);
            return res.render('./customer/product.ejs', {
                categoryInfo: category,
                storeInfo: storeinfo,
                productInfo: product,
                imageInfo: image,
                optionInfo: option,
                indexURL: idxURL,
                loginInfo: req.session.userID
            });
        })
    });
});

app.get('/customer/:shopURL/login', function (req, res) {
    // 로그인 페이지
    GetStoreInfo(req.params.shopURL, req.params.shopURL, (error, { storeinfo, category }) => {
        if (error)
            return res.send({ error });
        let idxURL = (req.params.shopURL).toString();

        return res.render('./customer/login.ejs', {
            storeInfo: storeinfo,
            categoryInfo: category,
            indexURL: idxURL,
            loginInfo: undefined
        });
    })
});

app.get('/customer/:shopURL/registration', function (req, res) {
    // 회원가입페이지
    GetStoreInfo(req.params.shopURL, req.params.shopURL, (error, { storeinfo, category }) => {
        if (error)
            return res.send({ error });
        let idxURL = (req.params.shopURL).toString();

        return res.render('./customer/registration.ejs', {
            storeInfo: storeinfo,
            categoryInfo: category,
            indexURL: idxURL,
            loginInfo: undefined
        });
    })
});

app.post('/customer/:shopURL/reg_process', function (req, res) {
    // 회원가입 요청
    let rb = req.body;
    Reg_process(req.params.shopURL, rb.id, rb.pw, rb.uname, rb.phone, rb.email, rb.birthdate, rb.gender, rb.address, (error, { user }) => {
        if (error) {
            return res.send({ error });
        }

        if (user == "Fail")
            console.log("회원가입실패");
        else
            console.log(rb.id + "회원가입");
        return res.redirect('/customer/' + req.params.shopURL);
    })
});

app.post('/customer/:shopURL/login_process', function (req, res) {
    // 로그인 요청
    Login_process(req.params.shopURL, req.body.id, req.body.pw, (error, { id }) => {
        console.log(id);
        if (id == "Fail") {
            console.log("로그인 에러")
        }
        else if (error) {
            return res.send({ error });
        }
        req.session.userID = id[0].ID;
        console.log(req.session + "로그인");
        req.session.save(function () {
            return res.redirect('/customer/' + req.params.shopURL);
        });
    })
});

app.post('/customer/:shopURL/idcheck', function (req, res) {
    // ID 중복 확인
    Customer_CheckID(req.params.shopURL, req.body.test, (error, { chkid }) => {
        console.log(chkid);
        if (error)
            console.log("ERROR : ", error);
        if (chkid[0].cnt == 1) {
            console.log("사용 불가능한 ID입니다.");
            res.send({ checkID: false });
        }
        else {
            console.log("사용 가능한 ID입니다.");
            res.send({ checkID: true });
        }
    })
});

app.post('/customer/:shopURL/phonecheck', function (req, res) {
    // 전화번호 중복 확인
    Customer_CheckPhone(req.params.shopURL, req.body.test, (error, { chkphone }) => {
        console.log(chkphone);
        if (error)
            console.log("ERROR : ", error);
        if (chkphone[0].cnt == 1) {
            res.send({ checkPhone: false });
        }
        else {
            res.send({ checkPhone: true });
        }
    })
});

app.post('/customer/:shopURL/emailcheck', function (req, res) {
    // 이메일 중복 확인
    Customer_CheckEmail(req.params.shopURL, req.body.test, (error, { chkemail }) => {
        console.log(chkemail);
        if (error)
            console.log("ERROR : ", error);
        if (chkemail[0].cnt == 1) {
            res.send({ checkEmail: false });
        }
        else {
            res.send({ checkEmail: true });
        }
    })
});


//Routing_sellers

// home.ejs
app.get('/sellers/home', (req, res) => {
    res.render('./sellers/home');
});

// signup.ejs
app.get('/sellers/signup1', (req, res) => {
    res.render('./sellers/signup1');
});

app.post('/sellers/signup2', (req, res) => {
    res.render('./sellers/signup2', { signup1: req.body });
});

app.post('/sellers/join', (req, res) => {
    join(req.body, (error, result) => {
        res.redirect('/sellers/home');
    });
});

// login.ejs
app.get('/sellers/login', (req, res) => {
    res.render('./sellers/login');
});

app.post('/sellers/login_process', (req, res) => {
    login(req.body, (error, result) => {
        var loginInfo = result.body[0];

        if (loginInfo == undefined) {
            res.redirect('/sellers/login');
        }
        else {
            req.session.url = loginInfo.URL;
            req.session.seller = loginInfo.ID;
            req.session.storeImg = loginInfo.image;
            req.session.shop = loginInfo.shopName;

            req.session.save(() => {
                return res.redirect('/sellers/' + req.session.url + '/dashboard');
            });
        }
    });
});

// logout
app.get('/sellers/logout', (req, res) => {
    req.session.destroy();

    res.redirect('/sellers/home');
});

// dashboard/dashboard.ejs
app.get('/sellers/:store/dashboard', (req, res) => {
    var store = req.params.store;

    var session = req.session;

    res.render('./sellers/dashboard/dashboard', { store: store, url: session.url, id: session.seller, storeImg: session.storeImg, shop: session.shop });
});

// dashboard/products/list.ejs
app.get('/sellers/:store/products/list', (req, res) => {
    var store = req.params.store;

    var session = req.session;

    getProductList(store, (error, productList) => {
        var all = productList.length, sale = 0, outofstock = 0, suspension = 0;

        for (let i = 0; i < productList.length; i++) {
            if (productList[i].stock == 0) {
                outofstock++;
            }
            else if (productList[i].status == '1') {
                sale++;
            }
            else {
                suspension++;
            }
        }

        const status = {
            all: all,
            sale: sale,
            outofstock: outofstock,
            suspension: suspension
        };

        getCategory(store, (error, category) => {
            res.render('./sellers/dashboard/products/list', { store: store, status: status, category: category, productList: productList, url: session.url, id: session.seller, storeImg: session.storeImg, shop: session.shop });
        });
    });
});

app.get('/sellers/:store/products/list_delete', (req, res) => {
    var store = req.params.store;

    var product = req.query.product;

    deleteProduct(store, product, (error, result) => {
        req.session.save(() => {
            res.redirect('/sellers/' + store + '/products/list');
        });
    });
});

// dashboard/products/register.ejs
app.get('/sellers/:store/products/register', (req, res) => {
    var store = req.params.store;

    var session = req.session;

    getCategory(store, (error, category) => {
        res.render('./sellers/dashboard/products/register', { store: store, category: category, url: session.url, id: session.seller, storeImg: session.storeImg, shop: session.shop });
    });
});

app.post('/sellers/:store/products/register_process', upload.array('image'), (req, res) => {
    const s3Client = s3.s3Client;

    var params = [];

    var images = [];

    var store = req.params.store;

    for (let i = 0; i < req.files.length; i++) {
        params.push(s3.uploadParams);
        params[i].Key = store + '/' + (new Date()).getTime() + '_' + req.files[i].originalname;
        params[i].Body = req.files[i].buffer;

        s3Client.upload(params[i], (err, data) => {
            images.push(data.Location);

            if (i == req.files.length - 1) {
                registerProduct(store, req.body, images, (error, result) => {
                    req.session.save(() => {
                        res.redirect('/sellers/' + store + '/products/register');
                    });
                });
            }
        });
    }
});

// dashboard/products/category.ejs
app.get('/sellers/:store/products/category', (req, res) => {
    var store = req.params.store;

    var session = req.session;

    getCategory(store, (error, category, tmp) => {
        res.render('./sellers/dashboard/products/category', { store: store, category: category, tmp: tmp, url: session.url, id: session.seller, storeImg: session.storeImg, shop: session.shop });
    });
});

app.post('/sellers/:store/products/category_register', (req, res) => {
    var store = req.params.store;

    registerCategory(store, req.body, (error, result) => {
        req.session.save(() => {
            res.redirect('/sellers/' + store + '/products/category');
        });
    });
});

app.post('/sellers/:store/products/category_delete', (req, res) => {
    var store = req.params.store;

    deleteCategory(store, req.body, (error, result) => {
        req.session.save(() => {
            res.redirect('/sellers/' + store + '/products/category');
        });
    });
});

// dashboard/benefits/list.ejs
app.get('/sellers/:store/benefits/list', (req, res) => {
    var store = req.params.store;

    var session = req.session;

    getBenefitList(store, (error, benefitList) => {
        res.render('./sellers/dashboard/benefits/list', { store: store, benefitList: benefitList, url: session.url, id: session.seller, storeImg: session.storeImg, shop: session.shop });
    });
});

app.get('/sellers/:store/benefits/list_delete', (req, res) => {
    var store = req.params.store;

    var benefit = req.query.benefit;

    deleteBenefit(store, benefit, (error, result) => {
        req.session.save(() => {
            res.redirect('/sellers/' + store + '/benefits/list');
        });
    });
});

// dashboard/benefits/register.ejs
app.get('/sellers/:store/benefits/register', (req, res) => {
    var store = req.params.store;

    var session = req.session;

    getCategory(store, (error, category) => {
        getProductList(store, (error, productList) => {
            res.render('./sellers/dashboard/benefits/register', { store: store, category: category, productList: productList, url: session.url, id: session.seller, storeImg: session.storeImg, shop: session.shop });
        });
    });
});

app.post('/sellers/:store/benefits/register_process', (req, res) => {
    var store = req.params.store;

    registerBenefit(store, req.body, (error, result) => {
        req.session.save(() => {
            res.redirect('/sellers/' + store + '/benefits/register');
        });
    });
});


var server = app.listen(3000, function () {
    console.log("Express server has started on port 3000")
});