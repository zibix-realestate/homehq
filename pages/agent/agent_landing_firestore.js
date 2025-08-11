const firestore = require('@classes/firestore')
const session_data = require('@classes/session_firestore')
const account = require('@classes/account_firestore')

class agent_landing {
  _invoke = async (req, res) => {
    let session = await session_data.update(req,res,{})
    let page_template = "agent/agent_landing.twig"
    
    // Get agent username from URL
    const agentUsername = req.params.username
    
    // Get agent data using Firestore
    const agents = await firestore.query('users', [
      { field: 'username', operator: '==', value: agentUsername },
      { field: 'status', operator: 'array-contains', value: 'agent' }
    ])
    
    if (agents.length === 0) {
      res.status(404).send('Agent not found')
      return
    }
    
    const agent = agents[0]
    
    // Sample data for demonstration - in production these would come from database
    const listings = [
      {
        id: 1,
        address: '123 Main Street',
        city: 'San Francisco',
        price: '$1,250,000',
        beds: 3,
        baths: 2,
        sqft: '2,100',
        image: '/images/sample-house1.jpg'
      },
      {
        id: 2,
        address: '456 Oak Avenue',
        city: 'Palo Alto',
        price: '$2,350,000',
        beds: 4,
        baths: 3,
        sqft: '3,200',
        image: '/images/sample-house2.jpg'
      },
      {
        id: 3,
        address: '789 Pine Road',
        city: 'Mountain View',
        price: '$985,000',
        beds: 2,
        baths: 2,
        sqft: '1,500',
        image: '/images/sample-house3.jpg'
      }
    ]
    
    const blogPosts = [
      {
        id: 1,
        title: 'Market Update: Q4 2024',
        excerpt: 'The real estate market continues to show strong growth in the Bay Area...',
        date: '2024-10-15'
      },
      {
        id: 2,
        title: 'First Time Home Buyer Tips',
        excerpt: 'Essential advice for navigating your first home purchase...',
        date: '2024-10-10'
      },
      {
        id: 3,
        title: 'Understanding Interest Rates',
        excerpt: 'How current interest rates affect your buying power...',
        date: '2024-10-05'
      }
    ]
    
    const neighborhoods = [
      {
        name: 'Pacific Heights',
        description: 'Luxury neighborhood with Victorian architecture and city views'
      },
      {
        name: 'Mission District',
        description: 'Vibrant cultural hub with diverse dining and nightlife'
      },
      {
        name: 'Noe Valley',
        description: 'Family-friendly area with charming boutiques and cafes'
      }
    ]
    
    const officeInfo = {
      name: 'Premier Realty Group',
      address: '100 Market Street, Suite 500',
      city: 'San Francisco, CA 94105',
      phone: '(415) 555-0100',
      email: 'info@premierrealty.com'
    }
    
    const customPages = [
      { title: 'About Me', url: `/agent/${agentUsername}/about` },
      { title: 'Testimonials', url: `/agent/${agentUsername}/testimonials` },
      { title: 'Contact', url: `/agent/${agentUsername}/contact` }
    ]
    
    res.render(page_template, {
      session,
      agent,
      listings,
      blogPosts,
      neighborhoods,
      officeInfo,
      customPages
    })
  }
}

module.exports = new agent_landing()