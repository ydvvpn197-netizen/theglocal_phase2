#!/usr/bin/env node

/**
 * Supabase MCP Server - Usage Examples
 * 
 * This file demonstrates how to use the MCP server tools
 * in various scenarios.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('📚 Supabase MCP Server - Usage Examples\n');

/**
 * Example 1: List all communities in a city
 */
async function example1_listCommunitiesByCity(city = 'Mumbai') {
  console.log(`\n1️⃣  List communities in ${city}`);
  console.log('-'.repeat(50));
  
  const { data, error } = await supabase
    .from('communities')
    .select('name, slug, member_count, is_private')
    .eq('location_city', city)
    .order('member_count', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log(`Found ${data.length} communities:`);
  data.forEach((comm, i) => {
    console.log(`   ${i + 1}. ${comm.name} - ${comm.member_count} members ${comm.is_private ? '🔒' : '🌐'}`);
  });
}

/**
 * Example 2: Find active artists by category
 */
async function example2_findArtistsByCategory(category = 'Musician') {
  console.log(`\n2️⃣  Find active ${category}s`);
  console.log('-'.repeat(50));
  
  const { data, error } = await supabase
    .from('artists')
    .select('stage_name, location_city, subscription_status, rate_min, rate_max')
    .eq('service_category', category)
    .in('subscription_status', ['trial', 'active'])
    .order('rating_avg', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log(`Found ${data.length} active ${category}s:`);
  data.forEach((artist, i) => {
    const rate = artist.rate_min && artist.rate_max 
      ? `₹${artist.rate_min}-${artist.rate_max}` 
      : 'Rate not set';
    console.log(`   ${i + 1}. ${artist.stage_name} (${artist.location_city}) - ${rate}`);
  });
}

/**
 * Example 3: Get upcoming events
 */
async function example3_getUpcomingEvents() {
  console.log(`\n3️⃣  Get upcoming events`);
  console.log('-'.repeat(50));
  
  const { data, error } = await supabase
    .from('events')
    .select('title, event_date, location_city, category, rsvp_count')
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .limit(5);
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log(`Found ${data.length} upcoming events:`);
  data.forEach((event, i) => {
    const date = new Date(event.event_date).toLocaleDateString();
    console.log(`   ${i + 1}. ${event.title} - ${date} (${event.location_city}) - ${event.rsvp_count} RSVPs`);
  });
}

/**
 * Example 4: Get recent posts with high engagement
 */
async function example4_getTopPosts(communityId = null) {
  console.log(`\n4️⃣  Get recent high-engagement posts`);
  console.log('-'.repeat(50));
  
  let query = supabase
    .from('posts')
    .select('title, upvotes, comment_count, created_at')
    .eq('is_deleted', false)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('upvotes', { ascending: false })
    .limit(5);
  
  if (communityId) {
    query = query.eq('community_id', communityId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log(`Found ${data.length} popular posts from last 7 days:`);
  data.forEach((post, i) => {
    console.log(`   ${i + 1}. ${post.title} - ${post.upvotes} upvotes, ${post.comment_count} comments`);
  });
}

/**
 * Example 5: Get active polls
 */
async function example5_getActivePolls(city = null) {
  console.log(`\n5️⃣  Get active polls${city ? ` in ${city}` : ''}`);
  console.log('-'.repeat(50));
  
  let query = supabase
    .from('polls')
    .select('question, category, total_votes, expires_at')
    .eq('is_active', true)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (city) {
    query = query.eq('location_city', city);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log(`Found ${data.length} active polls:`);
  data.forEach((poll, i) => {
    const expires = new Date(poll.expires_at).toLocaleDateString();
    console.log(`   ${i + 1}. [${poll.category}] ${poll.question}`);
    console.log(`      Votes: ${poll.total_votes}, Expires: ${expires}`);
  });
}

/**
 * Example 6: Database health check
 */
async function example6_healthCheck() {
  console.log(`\n6️⃣  Database health check`);
  console.log('-'.repeat(50));
  
  const tables = [
    { name: 'users', label: 'Users' },
    { name: 'communities', label: 'Communities' },
    { name: 'posts', label: 'Posts' },
    { name: 'artists', label: 'Artists' },
    { name: 'events', label: 'Events' },
    { name: 'bookings', label: 'Bookings' }
  ];
  
  console.log('Table counts:');
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table.name)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`   ❌ ${table.label}: Error - ${error.message}`);
    } else {
      console.log(`   ✅ ${table.label}: ${count} records`);
    }
  }
}

/**
 * Example 7: Search across tables
 */
async function example7_globalSearch(searchTerm = 'music') {
  console.log(`\n7️⃣  Global search for "${searchTerm}"`);
  console.log('-'.repeat(50));
  
  // Search communities
  const { data: communities } = await supabase
    .from('communities')
    .select('name, location_city')
    .ilike('name', `%${searchTerm}%`)
    .limit(3);
  
  if (communities?.length > 0) {
    console.log('\n📍 Communities:');
    communities.forEach(c => console.log(`   - ${c.name} (${c.location_city})`));
  }
  
  // Search posts
  const { data: posts } = await supabase
    .from('posts')
    .select('title')
    .or(`title.ilike.%${searchTerm}%,body.ilike.%${searchTerm}%`)
    .eq('is_deleted', false)
    .limit(3);
  
  if (posts?.length > 0) {
    console.log('\n📝 Posts:');
    posts.forEach(p => console.log(`   - ${p.title}`));
  }
  
  // Search artists
  const { data: artists } = await supabase
    .from('artists')
    .select('stage_name, service_category')
    .or(`stage_name.ilike.%${searchTerm}%,service_category.ilike.%${searchTerm}%`)
    .limit(3);
  
  if (artists?.length > 0) {
    console.log('\n🎨 Artists:');
    artists.forEach(a => console.log(`   - ${a.stage_name} (${a.service_category})`));
  }
}

/**
 * Run all examples
 */
async function runExamples() {
  try {
    await example1_listCommunitiesByCity('Mumbai');
    await example2_findArtistsByCategory('Musician');
    await example3_getUpcomingEvents();
    await example4_getTopPosts();
    await example5_getActivePolls('Delhi');
    await example6_healthCheck();
    await example7_globalSearch('music');
    
    console.log('\n' + '='.repeat(50));
    console.log('\n✨ Examples complete! Use these patterns in your MCP queries.\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples();
}

export {
  example1_listCommunitiesByCity,
  example2_findArtistsByCategory,
  example3_getUpcomingEvents,
  example4_getTopPosts,
  example5_getActivePolls,
  example6_healthCheck,
  example7_globalSearch
};


