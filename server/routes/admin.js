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
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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
          locals
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
          locals
      });
  } catch (error) {
      console.log('error');
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
          return res.redirect('/register');
      } else if (password.length < 8) {
          req.flash('error', 'Password must be at least 8 characters');
          return res.redirect('/register');
      } else {
          try {
              const user = await User.create({ username, email, password: hashedPassword });
              req.flash('success', 'User Created');
              return res.redirect('/login');
          } catch (error) {
              if (error.message.includes('duplicate key error')) {
                  req.flash('error', 'Username already in use');
                  return res.redirect('/register');
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
* Post
* Admin login 
*/
router.post('/admin/login', async (req,  res) => {
  
  try {

      const { username, password } = req.body;
      
      const user = await User.findOne({username});
      if(!user) {
          req.flash('error', 'Invalid credentials')
          return res.redirect('/login')
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if(!isPasswordValid) {
          req.flash('error', 'Invalid credentials')
          return res.redirect('/login')
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

//FORGOT PASSWORD
// Define nodemailer transporter
const transporter = nodemailer.createTransport({
service: 'gmail',
auth: {
  user: 'asiomizunoah@gmail.com',
  pass: 'sjkk bqkf pedt utvb' // Replace with your Gmail password
}
});

/**
* GET
* Forgot password page
*/
router.get('/forgot-password', async (req, res) => {

const locals = {
  title: "Forgot Password"
}
try {
  res.render('admin/forgot-password', {
    locals,
    currentPage: 'forgot-password'
  });
} catch (error) {
  console.log(error);
  res.status(500).send('Internal Server Error');
}
});

/**
* POST
* Forgot password form submission
*/
router.post('/forgot-password', async (req, res) => {
try {
  const { email } = req.body;

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    req.flash('error', 'User with this email does not exist');
    return res.redirect('/forgot-password');
  }

  // Generate and set reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour expiration

  // Save user with token (ensure asynchronous save completes)
  await user.save();

  // Prepare encoded reset link
  const encodedToken = encodeURIComponent(resetToken); // Encode spaces
  const resetLink = `http://${req.headers.host}/reset-password/${encodedToken}`;

  // Send password reset email
  const mailOptions = {
    from: 'asiomizunoah@gmail.com', // Consider using a dedicated email address for security
    to: email,
    subject: 'Reset your password',
    html: `
      <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
      <p>Please click on the following link, or paste this into your browser to complete the process:</p>
      <p><a href="${resetLink}">Reset Password</a></p>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
    `
  };

  await transporter.sendMail(mailOptions);

  req.flash('success', 'Password reset email sent');
  res.redirect('/forgot-password');
} catch (error) {
  console.error(error);
  res.status(500).send('Internal Server Error');
}
});



/**
* GET
* Reset password page
*/
router.get('/reset-password/:token', async (req, res) => {
try {
  const { token } = req.params;
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    req.flash('error', 'Password reset token is invalid or has expired');
    return res.redirect('/forgot-password');
  }

  // Render the password reset page with necessary data
  res.render('admin/reset-password', {
    locals: {
      title: 'Reset Password'
    },
    currentPage: 'reset-password',
    token // Pass the token to the view
  });
} catch (error) {
  console.error(error);
  res.status(500).send('Internal Server Error');
}
});


/**
* POST
* Reset password form submission
*/
router.post('/reset-password/:token', async (req, res) => {
try {
  const { token } = req.params;
  const { password } = req.body;
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    req.flash('error', 'Password reset token is invalid or has expired');
    return res.redirect('/forgot-password');
  }

  // Reset password and remove reset token
  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  req.flash('success', 'Password reset successfully');
  res.redirect('/login');
} catch (error) {
  console.log(error);
  res.status(500).send('Internal Server Error');
}
});

//FORGOT PASSWORD


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
 * GET
 * Admin Create New Post
 */

router.get('/add-post', authMiddleware, async (req,  res) => {

    try {
        const locals = {
            title: "Add Post",
        }

        const data = await Post.find();
        res.render('admin/add-post', {
            locals,
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
                title: req.body.title,
                target: req.body.target,
                raised: req.body.raised,
                percentage: req.body.percentage,
                preview: req.body.preview,
                body: req.body.body,
                image: imageObject
            });

            await Post.create(newPost);
            res.redirect('/posts');
            req.flash('success', 'Post Added');

            
        } catch (error) {
          console.log(error);  
        }
    } catch (error) {
        console.log(error);
    } 
}); 

/**
 * GET
 * Admin posts page
 */
router.get('/posts', authMiddleware, async (req, res) => {
  try {
      const locals = {
          title: "posts",
      };

      const data = await Post.find();
      res.render('admin/posts', {
          locals,
          data,
          layout: adminLayout,
          currentPage: 'posts'
      });
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
  
      res.render('admin/edit-post', {
        locals,
        data,
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
            title: req.body.title,
            target: req.body.target,
            raised: req.body.raised,
            percentage: req.body.percentage,
            preview: req.body.preview,
            body: req.body.body,
            updatedAt: Date.now(),
            image: imageObject
        });

        res.redirect('/posts');

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
        res.redirect('/posts');
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
      title: 'Add Testimonial',
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
        name: req.body.name,
        profession: req.body.profession,
        testimony: req.body.testimony,
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
            title: "Testimonials",
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
            title: "Edit Testimonial",
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
      project.name = req.body.name;
      project.profession = req.body.profession;
      project.testimony = req.body.testimony;
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
        districts: req.body.districts,
        volunteers: req.body.volunteers,
        goal: req.body.goal,
        raised: req.body.raised,
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
      service.districts = req.body.districts;
      service.volunteers = req.body.volunteers;
      service.goal = req.body.goal;
      service.raised = req.body.raised;
  
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
      title: 'Add Team',
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
router.post('/add-faq', authMiddleware, upload.single('image'), async (req, res) => {
  try {

    const imageObject = {
      data: req.file.buffer,
      contentType: req.file.mimetype
    };

    const newfaq = new Faq ({
      name: req.body.name,
      position: req.body.position,
      description: req.body.description,
      image: imageObject
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
          title: "Team Members."
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
          title: 'Edit Member'
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
    const imageObject = {
        data: req.file.buffer,
        contentType: req.file.mimetype
    };
   
    await Faq.findByIdAndUpdate(req.params.id, {

        name: req.body.name,
        position: req.body.position,
        image: imageObject
    });

    res.redirect('/faqs');

} catch (error) {
    console.log(error);
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
