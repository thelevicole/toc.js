( function( $ ) {
    'use strict';

    $.fn.tableOfContents = function( args = {} ) {

        /**
         * Merge our default values with user defined options.
         *
         * @type {object}
         */
        const options = $.extend( true, {
            contentTarget: $( document.body ),
            selectors: 'h1$1; h2$2; h3$3; h4$4; h5$5; h6$6;',
            nestingDepth: -1, // How deep we'll allow nesting
            slugLength: 40, // How many chars are alowed in the hash slug
            anchors: true,
            anchorText: '#',
            orderedList: false
        }, args );

        /**
         * Key should match an options key, value is the callback called for validating the value.
         *
         * @type {object}}
         */
        const optionValidators = {
            contentTarget: value => !value ? $( document.body ) : ( typeof value !== 'object' ? $( value ) : value ),
            selectors: value => {

                // Convert string value to array
                if ( typeof value === 'string' ) {
                    // h1 $1; h2$2; h3$3;.test:not(.this)$1;
                    value = value.split( ';' );
                }

                // Convert array value to object
                if ( Array.isArray( value ) ) {
                    const depthPattern = /\$([1-9]+)$/;
                    let cleaned = {};

                    for ( let i = 0; i < value.length; i++ ) {
                        // h1$1
                        // h2$2
                        // h3$3
                        // .test:not(.this)$1
                        const part = String( value[ i ] ).trim();

                        if ( part.length ) {
                            let depth = 1;
                            const depthParts = part.match( depthPattern );
                            const key = part.replace( depthPattern, '' ).trim();

                            if ( key.trim() ) {
                                if ( depthParts ) {
                                    depth = depthParts[ 1 ];
                                }

                                cleaned[ key ] = depth;
                            }
                        }
                    }

                    value = cleaned;
                }

                // Ensure selector depths are integers greater than 0
                if ( typeof value === 'object' ) {
                    for ( var selector in value ) {
                        value[ selector ] = parseInt( value[ selector ] ) || 1;
                    }
                }

                return value;
            },
            nestingDepth: value => Number( value ),
            slugLength: value => Number( value ),
            anchors: value => [ 'true', 'yes', '1' ].indexOf( String( value ).toLowerCase().trim() ) >= 0,
            anchorText: value => value,
            orderedList: value => [ 'true', 'yes', '1' ].indexOf( String( value ).toLowerCase().trim() ) >= 0,
        };

        // Override options using [data-toc-*] element attributes and validate passed args
        for ( var optionKey in optionValidators ) {
            // Convert studly case to kebab (nestedDepth => nested-depth)
            const dataKey = optionKey.replace( /([A-Z])/g, '-$1' ).toLowerCase().replace( /^-|-$/, '' );

            if ( this.data( `toc-${dataKey}` ) ) {
                options[ optionKey ] = optionValidators[ optionKey ]( this.data( `toc-${dataKey}` ) );
            } else {
                options[ optionKey ] = optionValidators[ optionKey ]( options[ optionKey ] );
            }
        }

        /**
         * Global array of hash links for generating unique slugs.
         *
         * @type {*[]}
         */
        window.tocHashMap = window.tocHashMap || [];

        /**
         * Make a string URL friendly.
         *
         * @param {string} string
         * @param {string} separator
         * @return {string}
         */
        const slugify = ( string, separator = '-' ) => {
            let slug = string
                .toString()
                .normalize( 'NFD' ) // Split an accented letter in the base letter and the acent
                .replace( /[\u0300-\u036f]/g, '' ) // Remove all previously split accents
                .toLowerCase()
                .trim()
                .replace( /[^a-z0-9 ]/g, '' ) // Remove all chars not letters, numbers and spaces (to be replaced)
                .replace( /\s+/g, separator );

            if ( options.slugLength > 0 ) {
                slug = slug.substr( 0, options.slugLength );
            }

            return slug;
        }

        /**
         * Create a hash value from a title.
         *
         * @param {string} text
         * @return {{title: string, hash: string}}
         */
        const createHash = ( text ) => {
            const slug = text && text.length ? slugify( text ) : 'toc';
            const numberLessSlug = slug.replace( /-[0-9]+$/, '' );

            const matches = window.tocHashMap.map( item => {
                const pattern = new RegExp( `^${numberLessSlug}(?:-([0-9]+))?$`, 'i' );
                const match = item.hash.match( pattern );
                if ( match ) {
                    return  match[ 1 ] ? Number( match[ 1 ] ) : 1;
                }
                return null;
            } ).filter( item => {
                return item !== null;
            } );

            const numeralAppendage = matches.length ? Math.max( ...matches ) : null;

            const parts = {
                hash: numeralAppendage !== null ? `${numberLessSlug}-${numeralAppendage + 1}` : slug,
                title: text
            };

            window.tocHashMap.push( parts );

            return parts;
        };


        /**
         * Create a standardised <ul> element.
         *
         * @return {jQuery}
         */
        const createList = () => $( options.orderedList ? '<ol>' : '<ul>', {
            class: 'toc-list'
        } );

        /**
         * Create a standardised link <a> element.
         *
         * @return {jQuery}
         */
        const createLink = ( url, title ) => $( '<a>', {
            href: url,
            text: title || url,
            class: 'toc-link'
        } );

        /**
         * Create a standardised <li> and <a> elements.
         *
         * @param {string} title
         * @param {string|null|undefined} link
         * @return {jQuery}
         */
        const createListItem = ( title, link ) => {
            const $li = $( '<li>', {
                class: `toc-item`
            } );

            if ( link ) {
                createLink( link, title ).appendTo( $li );
            } else if ( title ) {
                $li.text( title );
            }

            return $li;
        };

        /**
         * Create a standardised anchore element.
         *
         * @param {string} id
         * @return {*|jQuery|HTMLElement}
         */
        const createAnchorItem = ( id ) => $( '<a>', {
            class: 'toc-anchor',
            href: '#' + id,
            id: id,
            text: options.anchorText
        } );

        /**
         * Get an elements DOM index relevant to all it's parents
         *
         * @param {jQuery} $element
         * @param {string} seperator
         * @return {string}
         */
        const getElementDomIndex = ( $element, seperator = '.' ) => {
            const domIndexParts = [];

            $( $element.parents().get().reverse() ).each( function() {
                domIndexParts.push( $( this ).index() );
            } );

            domIndexParts.push( $element.index() );

            return domIndexParts.join( seperator );
        }

        let contentMap = [];

        for ( var selector in options.selectors ) {
            const depth = options.selectors[ selector ];
            options.contentTarget.find( selector ).each( function() {
                const $this = $( this );
                contentMap.push( {
                    index: getElementDomIndex( $this ),
                    $el: $this,
                    depth: depth
                } );
            } );
        }

        // Sort the content map by DOM index.
        contentMap.sort( function( a, b ) {

            if ( a.index < b.index ){
                return -1;
            }

            if ( a.index > b.index ){
                return 1;
            }

            return 0;
        } );

        const allowNesting = options.nestingDepth < 0 || options.nestingDepth > 0;
        const $html = createList();
        let lastDepth = 1;
        let $lastLi = $();

        const lists = [];

        for ( let itemIndex = 0; itemIndex < contentMap.length; itemIndex++ ) {
            const contentItem = contentMap[ itemIndex ];
            const $el = contentItem.$el;
            const hash = createHash( $el.text() );
            const depth = contentItem.depth;
            const $li = createListItem( hash.title, `#${hash.hash}` );

            // Add anchor link to item
            if ( options.anchors ) {
                createAnchorItem( hash.hash ).appendTo( $el );
            }

            // Handle nesting if enabled
            if ( allowNesting ) {

                // Higher depth
                if ( depth > lastDepth ) {

                    let $startingLi = $lastLi;

                    let limit = depth;

                    // Set limit to maximum nesting depth, if option has value
                    if ( options.nestingDepth > 0 && depth > options.nestingDepth ) {
                        limit = options.nestingDepth + 1;
                    }

                    limit = limit - lastDepth;

                    for ( let i = 0; i < limit; i++ ) {
                        // Create new sub-list
                        const $list = createList();

                        // Add list to last sub li
                        $startingLi.append( $list );

                        // Add new list depth
                        lists.push( $list );

                        // Add empty list item if multiple depths higher than last depth
                        if ( ( i + 1 ) < limit ) {
                            // Create new starting li for next loop
                            $startingLi = createListItem().appendTo( $list );
                        }
                    }
                }

                // Lower depth
                else if ( depth < lastDepth ) {

                    let limit = lastDepth;

                    // Set limit to maximum nesting depth, if option has value
                    if ( options.nestingDepth > 0 && lastDepth > options.nestingDepth ) {
                        limit = options.nestingDepth + 1;
                    }

                    limit = limit - depth;

                    for ( let i = 0; i < limit; i++ ) {
                        // Remove higher level lists
                        lists.pop();
                    }
                }

                // Same depth
                else {
                    // Do nothing
                }

            }

            // Add item to list
            ( lists.slice(-1).pop() || $html ).append( $li );

            // Store last meta
            lastDepth = depth;
            $lastLi = $li;
        }

        $html.appendTo( this );
    };

} )( jQuery );
