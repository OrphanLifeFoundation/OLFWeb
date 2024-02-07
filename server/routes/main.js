const express = require('express');
const router = express.Router();
const { Topic, Post } = require('../models/Post');
const nodemailer = require('nodemailer');
const Project = require('../models/Project');
const Service = require('../models/Service');
const { Faq, Ans } = require('../models/Faq');
const Comment = require('../models/Comment');
const bodyParser = require('body-parser');

const fetchPopularPosts = async () => {
  try {
    const popularPosts = await Post.aggregate([
      { $sort: { views: -1 } }, // Sort by views in descending order
      { $limit: 7 } // Get the top 4 popular posts
    ]);
    return popularPosts;
  } catch (error) {
    console.log(error);
    return [];
  }
};

// Apply the middlewares to all route
router.use(bodyParser.urlencoded({ extended: true })); 
/**
 * GET /
 * HOME
*/
router.get('', async (req, res) => {
  try {
    const locals = {
      title: "Orphan LIfe Foundation",
      description: "Charity website"
    }

    res.render('index', { 
      locals
    });

  } catch (error) {
    console.log(error);
  }

});

/**
 * GET /
 * Post :id
*/
router.get('/post/:id', async (req, res) => {
  try {
    let slug = req.params.id;
    const data = await Post.findById({ _id: slug });

    const popularPosts = await fetchPopularPosts();
    const topics = await Topic.find();
    
    const postId = req.params.id;
    const comments = await Comment.find({ post: postId }).populate('comment');
    const faqs = await Faq.find();

    const locals = {
      title: data.title,
      description:  data.preview
    }

    res.render('post', { 
      locals,
      topics,
      data,
      comments,
      popularPosts,
      currentRoute: `/post/${slug}`,
      currentUser: res.locals.currentUser,
      currentUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
      faqs
    });
  } catch (error) {
    console.log(error);
  }

});

/**
 * POST/
 * Commments
*/
router.post('/post/:id/add-comment', async (req, res) => {
  try {
    const postId = req.params.id;
    const parentCommentId = req.body.parentCommentId; // If it's a reply

    // Extract the visitor's name and email from the request body
    const { name, email } = req.body;

    // Create a new Comment document
    const comment = new Comment({
      comment: req.body.comment,
      author: { name, email }, // Store the visitor's name and email
      post: postId,
      parentId: parentCommentId, // If it's a reply, store the parent comment's _id
    });

    await comment.save();

    // Redirect back to the post after the comment is added
    res.redirect(`/post/${postId}`);
  } catch (error) {
    console.error(error);
    // Handle error response
    res.status(500).json({ error: 'First server error' });
  }
});


/**
 * POST /
 * Post - searchTerm
*/
router.post('/search', async (req, res) => {
  try {
    let searchTerm = req.body.searchTerm;
    const locals = {
      title: searchTerm,
    }

    const faqs = await Faq.find();
    const topics = await Topic.find();
    const searchNoSpecialChar = searchTerm.replace(/[^a-zA-Z0-9 ]/g, "")

    const popularPosts = await fetchPopularPosts();
    const data = await Post.find({
      $or: [
        { title: { $regex: new RegExp(searchNoSpecialChar, 'i') }},
        { body: { $regex: new RegExp(searchNoSpecialChar, 'i') }}
      ]
    });

    res.render("search", {
      data,
      topics,
      faqs,
      locals,
      popularPosts,
      currentRoute: 'search',
      currentUser: res.locals.currentUser
    });

  } catch (error) {
    console.log(error);
  }

});

/**
 * GET /
 * faqs
*/
router.get('/faqs/:id', async (req, res) => {
  try {

    let slug = req.params.id;
    const faq = await Faq.findById({ _id: slug });

    const faqId = req.params.id;
    const comments = await Comment.find({ post: faqId }).populate('comment');
    
    const faqs = await Faq.find(); 
    const popularPosts = await fetchPopularPosts();
    const topics = await Topic.find();

    const locals = {
      title: faq.qstn,
      description:  faq.description
    }
    res.render('faqs', { 
      faq,
      faqs,
      topics,
      popularPosts,
      comments,
      locals,
      currentRoute: `/faq/${slug}`,
     });
  } catch (error) {
    console.log(error);
    res.status(500).send('second Server Error');
  }
});

/**
 * GET /
 * Topics
*/
router.get('/topic/:topicId', async (req, res) => {
  try {
    
    const topicId = req.params.topicId;
    const posts = await Post.find({ topic: topicId }).sort({ createdAt: 'desc' }).populate('topic');
    const popularPosts = await fetchPopularPosts();
    const topics = await Topic.find();
    const topic = await Topic.find();
    const faqs = await Faq.find();
    const locals = {
      title:topic.name
    }

    res.render('topic', { 
      currentRoute: 'topic',
      posts,
      locals,
      topic,
      topics,
      popularPosts,
      faqs
     });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred.');
  }
});



// insertPostData();
// Configure Nodemailer


// Volunteer form submission
router.post('/vol-send-email', async (req, res) => {
    const {name, email, message } = req.body;

    // Create a nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
          user: 'asiomizunoah@gmail.com',
          pass: 'sjkk bqkf pedt utvb'
      }
    });

    // Email options
    const mailOptions = {
        from: email,
        to: 'asiomizunoah@gmail.com',  // Your email
        subject: 'Contact Form Submission',
        text: `Name: ${name}\nEmail: ${email}\nReason: ${message}`
    };

    try {
        // Send the email
        await transporter.sendMail(mailOptions);
        req.flash('success', 'Email sent successfully');
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error sending email');
    }
});

// Contct form submission
router.post('/send-email', async (req, res) => {
    const {name, email, message } = req.body;

    // Create a nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
          user: 'asiomizunoah@gmail.com',
          pass: 'sjkk bqkf pedt utvb'
      }
    });

    // Email options
    const mailOptions = {
        from: email,
        to: 'asiomizunoah@gmail.com',  // Your email
        subject: 'Contact Form Submission',
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    };

    try {
        // Send the email
        await transporter.sendMail(mailOptions);
        req.flash('success', 'Email sent successfully');
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error sending email');
    }
});


/**
 * GET /
 * About
*/
router.get('/about', async (req, res) => {

  try {

    const locals = {
      title: 'About',
      description: 'Your about page description'// Pass the projects data to the template
    };

    res.render('about', {
      locals
    }); // Render the about.ejs template with projects data
  } catch (error) {
    console.error(error);
    // Handle error response
    res.status(500).json({ error: 'Third  server error' });
  }
  
});

/**
 * GET /
 * single project
*/
router.get('/project/:id', async (req, res) => {
  try {
    const popularPosts = await fetchPopularPosts();
      const project = await Project.findById(req.params.id);
      const locals = {
        title: project.title,
        description: project.preview,
      }
      const topics = await Topic.find();
      const faqs = await Faq.find();

      res.render('project', { 
        locals,
        topics,
        project, 
        popularPosts,
        currentRoute: 'project',
        currentUser: res.locals.currentUser,
        faqs

   }); // Render the project.ejs template and pass the project data
  } catch (error) {
      console.log(error); // or handle as you prefer
  }
});

/**
 * GET /
 * Services
*/
router.get('/services', async(req, res) => {

  const services = await Service.find(); 
  const projects = await Project.find();
  const topics = await Topic.find();
  const faqs = await Faq.find();
  const locals = {
    title: 'Services',
    description: 'Your about page description'// Pass the topics data to the template
  };
  
  res.render('services', {
    currentRoute: '/services',
    currentUser: res.locals.currentUser,
    services,
    topics,
    projects,
    locals,
    faqs
  });
});

/**
 * GET /
 * single service
*/
router.get('/service/:id', async (req, res) => {
  try {

    const popularPosts = await fetchPopularPosts();
    const service = await Service.findById(req.params.id);
    const faqs = await Faq.find();
    const topics = await Topic.find();
    const locals = {
      title: service.title,
      description: service.preview,
    }

      res.render('service', { 
        locals,
        service, 
        topics,
        popularPosts,
        currentRoute: 'service',
        currentUser: res.locals.currentUser,
        faqs
   }); // Render the service.ejs template and pass the service data
  } catch (error) {
      console.log(error);
  }
});



module.exports = router;
