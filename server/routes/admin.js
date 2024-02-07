const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { Topic, Post } = require('../models/Post');
const Project = require('../models/Project');
const Service = require('../models/Service');
const { Faq, Ans } = require('../models/Faq');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const flash = require('express-flash');
const multer  = require('multer');
const storage = multer.memoryStorage();
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const upload = multer({
    storage: storage,
    limits: { fieldSize: 10 * 1024 * 1024 } // Increase the field size limit to 10MB
  });

  router.use(bodyParser.urlencoded({ extended: true })); 
  
/* const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, 'uploads');
      },
      filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now());
      }
    })
  }); */

const adminLayout = '../views/layouts/admin';
const jwtSecret = process.env.JWT_SECRET;
/**
 * GET
 * Admin-login page
 */
router.get('/login', async (req,  res) => {
    
    try {

        const locals = {
            title: "Login",
        }
    
        res.render('admin/login', { 
            locals, 
            layout: adminLayout,
            currentPage: 'login'
        });
    } catch (error) {
        console.log('error');
    }
});

/**
 * GET
 * Admin-register page
 */
router.get('/register', async (req,  res) => {
    
    try {

        const locals = {
            title: "Register"
        }
    
        res.render('admin/register', { 
            locals, 
            layout: adminLayout,
            currentPage: 'register'
        });
    } catch (error) {
        console.log('error');
    }
});

/**
 * Post
 * Admin login 
 */
router.post('/admin/login', async (req,  res) => {
    
    try {

        const { username, password } = req.body;
        
        const user = await User.findOne({username});
        if(!user) {
            req.flash('error', 'Invalid credentials')
            return res.redirect('/admin/login')
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if(!isPasswordValid) {
            req.flash('error', 'Invalid credentials')
            return res.redirect('/admin/login')
        }

        const token = jwt.sign({ userId: user._id}, jwtSecret);
        res.cookie('token', token, { httpOnly: true});
        res.redirect('/dashboard');
        req.flash('success', 'You are logged in')

    
       
    } catch (error) {
        console.log('error');
    }
}); 

/**
 * check-login 
 */
const authMiddleware = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect('/'); // Redirect unauthorized users to index.ejs
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.userId = decoded.userId;

        // Check if the authenticated user is an admin
        const user = await User.findById(req.userId);
        if (!user || !user.isAdmin) {
            return res.redirect('/'); // Redirect non-admin users to index.ejs
        }

        next();
    } catch (error) {
        return res.redirect('/'); // Redirect unauthorized users to index.ejs
    }
};




/**
 * GET
 * Admin dashboard
 */
router.get('/dashboard', authMiddleware, async (req,  res) => {

        try {
            const locals = {
                title: "Dashboard",
            }
            const data = await Post.find();
            res.render('admin/dashboard', {
                locals,
                data,
                currentPage: 'dashboard',
                layout: adminLayout,
            });
        } catch (error) {
            console.log(error);
        } 
}); 


/**
 * POST
 * Admin Register 
 */
router.post('/admin/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        if (!email || !password) {
            req.flash('error', 'Both Email and Password required');
            return res.redirect('/admin/register');
        } else if (password.length < 8) {
            req.flash('error', 'Password must be at least 8 characters');
            return res.redirect('/admin/register');
        } else {
            try {
                const user = await User.create({ username, email, password: hashedPassword });
                req.flash('success', 'User Created');
                return res.redirect('/admin/login');
            } catch (error) {
                if (error.message.includes('duplicate key error')) {
                    req.flash('error', 'Username already in use');
                    return res.redirect('/admin/register');
                }
                res.status(500).json({ message: 'Internal server error' });
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


/**
 * GET
 * Admin Create New Post
 */

router.get('/add-post', authMiddleware, async (req,  res) => {

    try {
        const locals = {
            title: "Add Post",
        }

        const data = await Post.find();
        const topics = await Topic.find();
        res.render('admin/add-post', {
            locals,
            topics,
            data,
            currentPage: 'add-post',
            layout: adminLayout,
        });
    } catch (error) {
        console.log(error);
    } 
}); 


/**
 * POST
 * Admin Create New Post
 */

router.post('/add-post', authMiddleware, upload.single('image'), async (req,  res) => {

    try {

        try {
    
            const imageObject = {
                data: req.file.buffer,
                contentType: req.file.mimetype
            };
    
            const newPost = new Post({
                topic: req.body.topic,
                title: req.body.title,
                preview: req.body.preview,
                body: req.body.body,
                image: imageObject
            });

            await Post.create(newPost);
            res.redirect('/dashboard');
            req.flash('success', 'Post Added');

            
        } catch (error) {
          console.log(error);  
        }
    } catch (error) {
        console.log(error);
    } 
}); 

router.get('/post/:id', authMiddleware, async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).render('error'); // or handle as you prefer
        }

        // Assuming you have a layout file for posts, update it as needed
        res.render('admin/posts', { layout: adminLayout, post });
    } catch (error) {
        console.log(error);
        res.status(500).render('error'); // or handle as you prefer
    }
});

/**
 * GET
 * Admin edit Post
 */

router.get('/edit-post/:id', authMiddleware, async (req, res) => {
    try {
  
      const locals = {
        title: "Edit Post",
      };
  
      const data = await Post.findOne({ _id: req.params.id });
      const topics = await Topic.find();
      const topic = await Topic.find();
  
      res.render('admin/edit-post', {
        locals,
        data,
        topic, 
        topics,
        layout: adminLayout,
        currentPage: 'edit-post'
      })
  
    } catch (error) {
      console.log(error);
    }
  
  });

/**
 * PUT
 * Admin Update Post
 */

router.put('/edit-post/:id', authMiddleware, upload.single('image'), async (req,  res) => {

    try {
        const imageObject = {
            data: req.file.buffer,
            contentType: req.file.mimetype
        };
       
        await Post.findByIdAndUpdate(req.params.id, {

            topic: req.body.topic,
            title: req.body.title,
            preview: req.body.preview,
            body: req.body.body,
            updatedAt: Date.now(),
            image: imageObject
        });

        res.redirect('/dashboard');

    } catch (error) {
        console.log(error);
    } 
});  

/**
 * DELETE POST
 * Admin Delete Post
 */
router.delete('/delete-post/:id', authMiddleware, async (req, res) => {

    try {
        await Post.deleteOne( { _id: req.params.id });
        res.redirect('/dashboard');
        req.flash('success', 'Post Deleted');
    } catch (error) {
        console.log('error')
    }
});

/**
 * GET
 * Admin Logout
 */
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    /* res.json({ message: 'Logout successful'}); */
    res.redirect('/');
});

/**
 * GET
 * Admin users page
 */
router.get('/users', authMiddleware, async (req, res) => {
    try {
        const locals = {
            title: "Users",
        };

        const users = await User.find();
        res.render('admin/users', {
            locals,
            users,
            layout: adminLayout,
            currentPage: 'users'
        });
    } catch (error) {
        console.log(error);
    }
});

/**
 * GET
 * Admin Edit User
 */
router.get('/edit-user/:id', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).render('error'); // or handle as you prefer
        }

        const locals = {
            title: 'Edit User',
        };

        res.render('admin/edit-user', {
            locals,
            layout: adminLayout,
            user,
            currentPage: 'edit-user'
        });
    } catch (error) {
        console.log(error);
        res.status(500).render('error'); // or handle as you prefer
    }
});

/**
 * POST
 * Admin Update User
 */
router.post('/edit-user/:id', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.id;
        const { username, email, password, passwordconf, isAdmin } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).render('error'); // or handle as you prefer
        }

        user.username = username;
        user.email = email;
        user.isAdmin = isAdmin === 'true';

        if (password && password === passwordconf) {
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
        }

        await user.save();
        res.redirect('/users'); // Redirect to the users page after updating
    } catch (error) {
        console.log(error);
        res.status(500).render('error'); // or handle as you prefer
    }
});

/**
 * DELETE User
 * Admin Delete User
 */
router.delete('/delete-user/:id', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).render('error'); // or handle as you prefer
        }

        await user.deleteOne( { _id: req.params.id });
        res.redirect('/users');
        req.flash('success', 'User deleted') // Redirect to the users page after deletion
    } catch (error) {
        console.log(error); // or handle as you prefer
    }
});

/**
 * GET
 * Admin Create User Form
 */
router.get('/create-user', authMiddleware, async (req, res) => {
    try {
        const locals = {
            title: "Create User",
        };
        
        res.render('admin/create-user', {
            locals,
            currentPage: 'create-user',
            layout: adminLayout
        });

    } catch (error) {
        console.log(error);
    }
});

/**
 * POST
 * Admin Create User
 */
router.post('/create-user', authMiddleware, async (req, res) => {
    try {
        const { username, email, password, passwordconf, role } = req.body;

        // Additional validation here if needed

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            email,
            password: hashedPassword,
            isAdmin: role === 'Admin'
        });

        await user.save();
        res.redirect('/users');
        req.flash('success', 'User created') // Redirect to the users page after user creation
    } catch (error) {
        console.log(error);
    }
});


//**
  //GET
 // Admin Add-projects
 //
router.get('/add-project', authMiddleware, (req, res) => {
    const locals = {
      title: 'Add Project',
      currentPage: 'add-project',
      layout: adminLayout,
    };
  
    res.render('admin/add-project', locals);
});



  //**
  //POST
 // Admin Create new projects
 //
router.post('/add-project', authMiddleware, upload.single('image'), async (req, res) => {
    try {
  
      const imageObject = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
  
      const newProject = new Project ({
        title: req.body.title,
        body: req.body.body,
        preview: req.body.preview,
        image: imageObject
      });
  
      await Project.create(newProject);
      res.redirect('/latest-projects');
      req.flash('success', 'Project Added') // Redirect to the dashboard or other appropriate page
    } catch (error) {
      console.error(error);
      // Handle error response
      res.status(500).json({ error: 'Internal server error' });
    }
  });



  //**
  //GET
 // Admin Latest-projects
 //
 router.get('/latest-projects', authMiddleware, async (req, res) => {
    try {
        const locals = {
            title: "Latest Projects",
        };

      const projects = await Project.find(); // Fetch all projects from the database
  
      // Render the latest-projects.ejs page and pass the projects as locals
      res.render('admin/latest-projects', {
        locals,
        projects,
        layout: adminLayout,
        currentPage: 'latest-projects'
    });
    } catch (error) {
      console.error(error);
      // Handle error response
      res.status(500).json({ error: 'Internal server error' });
    }
  });


   //**
  //GET
 // Admin Edit project
 //
  router.get('/edit-project/:id', authMiddleware, async (req, res) => {
    try {
        const locals = {
            title: "Edit project",
        };
        
      const projectId = req.params.id;
      const project = await Project.findOne({ _id: req.params.id }); // Fetch the project from the database
  
      if (!project) {
        return res.status(404).render('error'); // Handle not found case
      }
  
      // Render the edit-project.ejs page and pass the project as locals
      res.render('admin/edit-project', { 
        project,
        locals,
        layout: adminLayout,
        currentPage: 'edit-project'
    });
    } catch (error) {
      console.error(error);
      // Handle error response
      res.status(500).json({ error: 'Internal server error' });
    }
});

  router.post('/edit-project/:id', authMiddleware, upload.single('image'), async (req, res) => {
    try {
      const projectId = req.params.id;
      const project = await Project.findById(projectId); // Fetch the project from the database
  
      const imageObject = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
  
      // Update the project properties
      project.title = req.body.title;
      project.body = req.body.body;
      project.preview = req.body.preview;
      project.image = imageObject;
  
      await project.save(); // Save the updated project
  
      res.redirect('/latest-projects');
      req.flash('success', 'Project Updated'); // Redirect to the latest-projects page
    } catch (error) {
      console.error(error);
      // Handle error response
      res.status(500).json({ error: 'Internal server error' });
    }
  });


   //**
  //DELETE
 // Admin Delete projects
 //
  router.delete('/delete-project/:id', authMiddleware, async (req, res) => {
    try {
      const projectId = req.params.id;
      const project = await Project.findById(projectId); // Fetch the project from the database
  
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
  
      await project.deleteOne( { _id: req.params.id }); // Remove the project from the database
  
      res.redirect('/latest-projects');
      req.flash('success', 'Project Deleted') // Redirect to the latest-projects page after deletion
    } catch (error) {
      console.error(error);
      // Handle error response
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  //**
  //GET
 // Admin Add-topics
 //
router.get('/add-topic', authMiddleware, (req, res) => {
  const locals = {
    title: 'Add New topic',
    currentPage: 'add-topic',
    layout: adminLayout,
  };

  res.render('admin/add-topic', locals);
});

  //**
  //POST
 // Admin Create new topics
 //
router.post('/add-topic', authMiddleware,  async (req, res) => {
    try {
      const newtopic = new Topic ({
        name: req.body.name,
      });
  
      await Topic.create(newtopic);
      res.redirect('/topics');
      req.flash('success', 'topic Added') // Redirect to the dashboard or other appropriate page
    } catch (error) {
      console.error(error);
      // Handle error response
      res.status(500).json({ error: 'Internal server error' });
    }
  });



  //**
  //GET
 // Admin Latest-topics
 //
 router.get('/topics', authMiddleware, async (req, res) => {
    try {
        const locals = {
            title: "Latest topics"
        };

      const topics = await Topic.find(); // Fetch all topics from the database
  
      // Render the latest-topics.ejs page and pass the topics as locals
      res.render('admin/topics', {
        locals,
        topics,
        layout: adminLayout,
        currentPage: 'topics'
    });
    } catch (error) {
      console.error(error);
      // Handle error response
      res.status(500).json({ error: 'Internal server error' });
    }
  });


   //**
  //GET
 // Admin Edit topic
 //
  router.get('/edit-topic/:id', authMiddleware, async (req, res) => {
    try {
        const locals = {
            title: "Edit topic"
        };
        
      const topicId = req.params.id;
      const topic = await Topic.findOne({ _id: req.params.id }); // Fetch the topic from the database
  
      if (!topic) {
        return res.status(404).render('error'); // Handle not found case
      }
  
      // Render the edit-topic.ejs page and pass the topic as locals
      res.render('admin/edit-topic', { 
        topic,
        locals,
        layout: adminLayout,
        currentPage: 'edit-topic'
    });
    } catch (error) {
      console.error(error);
      // Handle error response
      res.status(500).json({ error: 'Internal server error' });
    }
});

  router.post('/edit-topic/:id', authMiddleware, async (req, res) => {
    try {
      const topicId = req.params.id;
      const topic = await Topic.findById(topicId); // Fetch the topic from the database
  
      // Update the topic properties
      topic.name = req.body.name;
  
      await topic.save(); // Save the updated topic
  
      res.redirect('/topics');
      req.flash('success', 'topic Updated'); // Redirect to the latest-topics page
    } catch (error) {
      console.error(error);
      // Handle error response
      res.status(500).json({ error: 'Internal server error' });
    }
  });


   //**
  //DELETE
 // Admin Delete topics
 //
  router.delete('/delete-topic/:id', authMiddleware, async (req, res) => {
    try {
      const topicId = req.params.id;
      const topic = await Topic.findById(topicId); // Fetch the topic from the database
  
      if (!topic) {
        return res.status(404).json({ error: 'topic not found' });
      }
  
      await Topic.deleteOne( { _id: req.params.id }); // Remove the topic from the database
  
      res.redirect('/topics');
      req.flash('success', 'topic Deleted') // Redirect to the latest-topics page after deletion
    } catch (error) {
      console.error(error);
      // Handle error response
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  //**
  //GET
 // Admin Add Services
 //
 router.get('/add-service', authMiddleware, (req, res) => {
    const locals = {
        title: 'Add Service',
        currentPage: 'add-service',
        layout: adminLayout,
      };
    res.render('Admin/add-service', locals); // Replace with your actual view name
});

//**
  //POST
 // Admin Add Services
 //
 router.post('/add-service', authMiddleware, upload.single('image'), async (req, res) => {
    try {
      const newService = new Service ({
        title: req.body.title,
        body: req.body.body,
        preview: req.body.preview,
      });
  
      await Service.create(newService);
      res.redirect('/my-services');
      req.flash('success', 'Service Added')// Redirect to the dashboard or other appropriate page
    } catch (error) {
      console.error(error);
      // Handle error response
      res.status(500).json({ error: 'Internal server error' });
    }
  });



//**
  //GET 
 // Admin Services
 //
 router.get('/my-services', authMiddleware, async (req, res) => {
    try {
        const services = await Service.find();
        const locals = {
            services: services,
            title: 'My Services',
            currentPage: 'my-services',
            layout: adminLayout,
        };
        res.render('Admin/my-services', locals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


router.get('/edit-service/:id', authMiddleware, async (req, res) => {
    try {
        const locals = {
            title: 'Edit Service',
            description: 'Add a new service to your Project.',
        };

        const service = await Service.findOne({ _id: req.params.id });

        res.render('Admin/edit-service', { 
            locals,
            service,
            currentPage: 'edit-service',
            layout: adminLayout,
         });
    } catch (error) {
        console.error(error);
        // Handle error response
        res.status(500).render( { error: 'Internal server error' });
    }
});

router.post('/edit-service/:id', authMiddleware, upload.single('image'),  async (req, res) => {
    try {
      const serviceId = req.params.id;
      const service = await Service.findById(serviceId);
  
      // Update the service properties
      service.title = req.body.title;
      service.body = req.body.body;
      service.preview = req.body.preview;
  
      await service.save(); // Save the updated service
  
      res.redirect('/my-services'); 
      req.flash('success', 'Service edited');// Redirect to the latest-services page
    } catch (error) {
      console.error(error);
      // Handle error response
      res.status(500).json({ error: 'Internal server error' });
    }
  });

     //**
  //DELETE
 // Admin Delete projects
 //
 router.delete('/delete-service/:id', authMiddleware, async (req, res) => {
    try {
      const serviceId = req.params.id;
      const service = await Service.findById(serviceId); // Fetch the service from the database
  
      if (!service) {
        return res.status(404).json({ error: 'service not found' });
      }
  
      await service.deleteOne( { _id: req.params.id }); // Remove the service from the database
  
      res.redirect('/my-services');
      req.flash('success', 'Service Deleted'); // Redirect to the latest-services page after deletion
    } catch (error) {
      console.error(error);
      // Handle error response
      res.status(500).json({ error: 'Internal server error' });
    }
  });

    //**
  //GET
 // Admin Add faqs
 //
 router.get('/add-faq', authMiddleware, (req, res) => {
  const locals = {
      title: 'Add faq',
      layout: adminLayout,
    };
  res.render('admin/add-faq',{
   locals,
   layout: adminLayout,
   currentPage: 'add-faq'
  }); // Replace with your actual view name
});

//**
//POST
// Admin Add faqs
//
router.post('/add-faq', authMiddleware, async (req, res) => {
  try {
    const newfaq = new Faq ({
      qstn: req.body.qstn,
      ans: req.body.ans,
      description: req.body.description
    });

    await Faq.create(newfaq);
    console.log(newfaq);
    res.redirect('/faq');// Redirect to the dashboard or other appropriate page
  } catch (error) {
    console.error(error);
    // Handle error response
    res.status(500).json({ error: 'Internal server error' });
  }
});

//**
  //GET
 // Admin faqs
 //
 router.get('/faq', authMiddleware, async (req, res) => {
  try {
      const locals = {
          title: "Frequently asked questions."
      };

      const faqs = await Faq.find(); 
    // Render the faqs.ejs page and pass the faqs as locals
    res.render('admin/faq', {
      locals,
      faqs,
      layout: adminLayout,
      currentPage: 'faq'
  });
  } catch (error) {
    console.error(error);
    // Handle error response
    res.status(500).json({ error: 'Internal server error' });
  }
});

//**
//GET
// Admin Edit faqs
//
router.get('/edit-faq/:id', authMiddleware, async (req, res) => {
  try {
      const locals = {
          title: 'Edit faq'
      };

      const faq = await Faq.findOne({ _id: req.params.id });

      res.render('admin/edit-faq', { 
          locals,
          faq,
          layout: adminLayout,
          currentPage: 'edit-faq'
       });
  } catch (error) {
      console.error(error);
      // Handle error response
      res.status(500).render( { error: 'Internal server error' });
  }
});

//**
//POST
// Admin Edit faqs
//
router.post('/edit-faq/:id', authMiddleware, async (req, res) => {
  try {
    const faqId = req.params.id;
    const faq = await Faq.findById(faqId);

    if (!faq) {
      // faq not found
      return res.status(404).json({ error: 'faq not found' });
    }

    // Update the faq properties
    faq.qstn = req.body.qstn;
    faq.ans = req.body.ans;
    faq.description = req.body.description;

    await Faq.save();

    res.redirect('/faq');
  } catch (error) {
    console.error(error);

    // Handle error response
    res.status(500).json({ error: 'Internal server error' });
  }
});

   //**
//DELETE
// Admin Delete faq
//
router.delete('/delete-faq/:id', authMiddleware, async (req, res) => {
  try {
    const faqId = req.params.id;
    const faq = await Faq.findById(faqId); 

    await Faq.deleteOne( { _id: req.params.id }); // Remove the faq from the database

    res.redirect('/faq'); 
  } catch (error) {
    console.error(error);
    // Handle error response
    res.status(500).json({ error: 'Internal server error' });
  }
});


  







module.exports = router, { authMiddleware };
