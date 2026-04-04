import { config, collection, fields, singleton } from '@keystatic/core';

const isLocal = process.env.NODE_ENV === 'development' || !process.env.NETLIFY;

export default config({
  storage: isLocal
    ? { kind: 'local' }
    : {
        kind: 'github',
        repo: 'tecsof/circulardesign',
        branchPrefix: 'keystatic/',
        pathPrefix: 'site',
        branch: 'main',
      },
  ui: {
    brand: { name: 'Circular Design' },
  },
  singletons: {
    homepage: singleton({
      label: 'Homepage',
      path: 'src/content/pages/homepage/',
      format: 'json',
      schema: {
        tagline: fields.text({ label: 'Tagline' }),
        subtitle: fields.text({ label: 'Subtitle', multiline: true }),
        aboutTitle: fields.text({ label: 'About Title' }),
        aboutText: fields.markdoc({ label: 'About Text' }),
      },
    }),
    theory: singleton({
      label: 'Theory Page',
      path: 'src/content/pages/theory/',
      format: 'json',
      schema: {
        title: fields.text({ label: 'Title' }),
        content: fields.markdoc({ label: 'Content' }),
      },
    }),
    glossary: singleton({
      label: 'Glossary Page',
      path: 'src/content/pages/glossary/',
      format: 'json',
      schema: {
        title: fields.text({ label: 'Title' }),
        content: fields.markdoc({ label: 'Content' }),
      },
    }),
  },
  collections: {
    strategies: collection({
      label: 'Strategies',
      slugField: 'name',
      path: 'src/content/strategies/*/',
      format: 'json',
      schema: {
        name: fields.slug({ name: { label: 'Strategy Name' } }),
        x1: fields.select({
          label: 'X1 (Main Objective)',
          options: [
            { label: 'Design for Maintenance', value: 'Maintenance' },
            { label: 'Design for Reuse', value: 'Reuse' },
            { label: 'Design for Refurbishment', value: 'Refurbishment' },
            { label: 'Design for Remanufacturing', value: 'Remanufacturing' },
            { label: 'Design for Recycle', value: 'Recycle' },
          ],
          defaultValue: 'Reuse',
        }),
        x2: fields.text({ label: 'X2 (Strategy Group)' }),
        x3: fields.text({ label: 'X3 (Strategy Name)' }),
        type: fields.select({
          label: 'Lifecycle Phase',
          options: [
            { label: 'Business & Network', value: 'business' },
            { label: 'Resources & Production', value: 'resource' },
            { label: 'Forward Logistics', value: 'logistics' },
            { label: 'Sale', value: 'sale' },
            { label: 'Use & Operation', value: 'use' },
            { label: 'Service & Maintenance', value: 'service' },
            { label: 'Reverse Logistics', value: 'reverse' },
            { label: 'Recovery', value: 'recovery' },
          ],
          defaultValue: 'use',
        }),
        why: fields.markdoc({ label: 'Why' }),
        how: fields.markdoc({ label: 'How' }),
        use: fields.markdoc({ label: 'Use' }),
        characteristics: fields.markdoc({ label: 'Characteristics' }),
        questionsToAnswer: fields.markdoc({ label: 'Questions to Answer' }),
        references: fields.text({ label: 'References', multiline: true }),
        caseStudyId: fields.text({ label: 'Case Study ID' }),
        loop: fields.multiselect({
          label: 'Loop',
          options: [
            { label: 'Loop 1', value: 'LOOP 1' },
            { label: 'Loop N', value: 'LOOP N' },
            { label: 'Last Loop', value: 'LAST LOOP' },
          ],
        }),
        appliesTo: fields.multiselect({
          label: 'Applies To',
          options: [
            { label: 'Materials', value: 'Materials' },
            { label: 'Components', value: 'Components' },
            { label: 'Products', value: 'Products' },
            { label: 'Systems', value: 'Systems' },
          ],
        }),
        productTags: fields.text({ label: 'Product Tags (comma-separated)' }),
        circularityIndex: fields.number({ label: 'Circularity Index' }),
        dfxRelationship: fields.text({
          label: 'Related Strategies (comma-separated X3 names)',
        }),
        authorId: fields.text({ label: 'Author ID' }),
      },
    }),
    caseStudies: collection({
      label: 'Case Studies',
      slugField: 'title',
      path: 'src/content/case-studies/*/',
      format: 'json',
      schema: {
        id: fields.number({ label: 'Legacy ID' }),
        title: fields.slug({ name: { label: 'Title' } }),
        heroImage: fields.image({
          label: 'Hero Image',
          directory: 'public/images/case-studies',
          publicPath: '/images/case-studies/',
        }),
        videoLink: fields.text({ label: 'Video Link' }),
        body: fields.markdoc({ label: 'Case Study' }),
        links: fields.text({ label: 'Links (url;label per line)', multiline: true }),
        x3: fields.text({
          label: 'Related Strategy Names (comma-separated)',
        }),
        filterFocus: fields.multiselect({
          label: 'Focus',
          options: [
            { label: 'Materials', value: 'MATERIALS' },
            { label: 'Components', value: 'COMPONENTS' },
            { label: 'Products', value: 'PRODUCT' },
            { label: 'Systems', value: 'SYSTEM' },
          ],
        }),
        filterCycle: fields.multiselect({
          label: 'Cycle',
          options: [
            { label: 'Technical', value: 'TECHNICAL' },
            { label: 'Biological', value: 'BIOLOGICAL' },
          ],
        }),
        filterX1: fields.multiselect({
          label: 'Design for X1',
          options: [
            { label: 'Maintain', value: 'MAINTAIN' },
            { label: 'Reuse', value: 'REUSE' },
            { label: 'Refurbish', value: 'REFURBISH' },
            { label: 'Remanufacture', value: 'REMANUFACTURE' },
            { label: 'Recycle', value: 'RECYCLE' },
          ],
        }),
        filterBusinessModel: fields.multiselect({
          label: 'Business Model',
          options: [
            { label: 'Product Oriented', value: 'PRODUCT ORIENTED' },
            { label: 'Use Oriented', value: 'USE ORIENTED' },
            { label: 'Result Oriented', value: 'RESULT ORIENTED' },
          ],
        }),
        filterMaterialFlow: fields.multiselect({
          label: 'Material Flow',
          options: [
            { label: 'Linear', value: 'LINEAR' },
            { label: 'Linear Extension', value: 'LINEAR EXTENSION' },
            { label: 'Circular', value: 'CIRCULAR' },
            { label: 'Circular Extension', value: 'CIRCULAR EXTENSION' },
          ],
        }),
      },
    }),
    contributors: collection({
      label: 'Contributors',
      slugField: 'name',
      path: 'src/content/contributors/*/',
      format: 'json',
      schema: {
        id: fields.number({ label: 'Legacy ID' }),
        name: fields.slug({ name: { label: 'Name' } }),
        bio: fields.markdoc({ label: 'Bio' }),
        headshot: fields.image({
          label: 'Headshot',
          directory: 'public/images/contributors',
          publicPath: '/images/contributors/',
        }),
        link1: fields.text({ label: 'Link 1' }),
        link2: fields.text({ label: 'Link 2' }),
      },
    }),
    glossaryTerms: collection({
      label: 'Glossary Terms',
      slugField: 'term',
      path: 'src/content/glossary-terms/*/',
      format: 'json',
      schema: {
        term: fields.slug({ name: { label: 'Term' } }),
        definition: fields.text({ label: 'Definition', multiline: true }),
      },
    }),
    publications: collection({
      label: 'Publications',
      slugField: 'title',
      path: 'src/content/publications/*/',
      format: 'json',
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        year: fields.text({ label: 'Year' }),
        image: fields.image({
          label: 'Cover Image',
          directory: 'public/images/publications',
          publicPath: '/images/publications/',
        }),
        url: fields.text({ label: 'Link URL' }),
      },
    }),
    onlineTools: collection({
      label: 'Online Tools',
      slugField: 'title',
      path: 'src/content/online-tools/*/',
      format: 'json',
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        category: fields.text({ label: 'Category' }),
        image: fields.image({
          label: 'Image',
          directory: 'public/images/online-tools',
          publicPath: '/images/online-tools/',
        }),
        url: fields.text({ label: 'Link URL' }),
      },
    }),
    courses: collection({
      label: 'Courses',
      slugField: 'title',
      path: 'src/content/courses/*/',
      format: 'json',
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        category: fields.text({ label: 'Category' }),
        description: fields.text({ label: 'Description' }),
        image: fields.image({
          label: 'Image',
          directory: 'public/images/courses',
          publicPath: '/images/courses/',
        }),
        url: fields.text({ label: 'Link URL' }),
      },
    }),
  },
});
