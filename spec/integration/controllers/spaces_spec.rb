describe "Spaces" do
  before(:all) do
    fixture(:user)
  end

  it "should create a space" do
    sign_in

    nr_spaces = @user.owned_spaces.count

    rc = api_call post "/users/#{@user.id}/spaces", {
      title: "The Zoo"
    }

    rc.should succeed
    @user.refresh.owned_spaces.count.should == nr_spaces + 1
  end

  context "as a creator" do

    before(:all) do
      fixture(:user)
      fixture(:another_user)
      @space = valid! fixture(:space)
    end

    before do
      sign_in
    end

    it "should update info" do
      rc = api_call put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
        title: "The Zoofighters"
      }

      rc.should succeed
      @space.refresh.title.should == 'The Zoofighters'
    end

    it "should update settings" do
      api {
        put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
          preferences: {
            'publishing' => {
              'layout' => {
                'name' => 'fluid'
              },
              'theme' => {
                'name' => 'Clean'
              }
            }
          }
        }
      }.should succeed
      @space.refresh.p('publishing.layout.name').should == 'fluid'
      @space.refresh.p('publishing.theme.name').should == 'Clean'
    end

    it "should add members" do

      rc = api_call put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
        memberships: [
          { user_id: @u2.id, role: :admin }
        ]
      }
      rc.should succeed
      @space.admins.count.should == 1
      @space.admins.last.id.should == @u2.id
    end

    it "should remove members" do
      @space.add_admin(@u2)
      rc = api_call put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
        memberships: [
          { user_id: @u2.id, role: nil }
        ]
      }

      rc.should succeed
      @space.admins.count.should == 0
    end

    it "should promote members" do
      @space.add_member(@u2)
      rc = api_call put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
        memberships: [
          { user_id: @u2.id, role: :editor }
        ]
      }
      rc.should succeed
      @space = @space.refresh
      @space.role_of(@u2).should == 'editor'

      rc = api_call put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
        memberships: [
          { user_id: @u2.id, role: :editor }
        ]
      }

      rc.should succeed
      @space = @space.refresh
      @space.role_of(@u2).should == 'editor'
    end

    it "should demote members" do
      @space.add_editor(@u2)
      rc = api_call put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
        memberships: [
          { user_id: @u2.id, role: :member }
        ]
      }

      rc.should succeed
      @space = @space.refresh
      @space.role_of(@u2).should == 'member'

      rc = api_call put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
        memberships: [
          { user_id: @u2.id, role: :member }
        ]
      }

      rc.should succeed
      @space = @space.refresh
      @space.role_of(@u2).should == 'member'
    end
  end

  context "as an admin" do

    before(:all) do
      valid! fixture(:user)
      valid! fixture(:another_user)
      @some_user  = valid! fixture(:some_user)
      @space      = valid! fixture(:space)
      @space.add_admin(@u2)
    end

    before do
      sign_in(@u2)
      @space.kick(@some_user)
    end

    it "should update a space's info" do
      api {
        put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
          title: "The Zoofighters"
        }
      }.should fail(403, 'Only the space creator can do that')
    end

    it "should add members" do
      api {
        put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
          memberships: [
            { user_id: @some_user.id, role: :admin }
          ]
        }
      }.should fail(403, 'You can not add admins to this space.')

      api {
        put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
          memberships: [
            { user_id: @some_user.id, role: :editor }
          ]
        }
      }.should succeed
    end

    it "should remove members" do
      @space.add_admin(@some_user)

      api {
        put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
          memberships: [
            { user_id: @some_user.id, role: nil }
          ]
        }
      }.should fail(403, 'You can not kick admins in this space.')

      @space.add_editor(@some_user)

      api {
        put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
          memberships: [
            { user_id: @some_user.id, role: nil }
          ]
        }
      }.should succeed
    end

    it "should promote members" do
      @space.add_member(@some_user)

      api {
        put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
          memberships: [
            { user_id: @some_user.id, role: :editor }
          ]
        }
      }.should succeed

      api {
        put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
          memberships: [
            { user_id: @some_user.id, role: :admin }
          ]
        }
      }.should fail(403, 'can not promote member')
    end

    it "should demote members" do
      @space.add_editor(@some_user)

      api {
        put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
          memberships: [
            { user_id: @some_user.id, role: :member }
          ]
        }
      }.should succeed

      @space.add_admin(@some_user)

      api {
        put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
          memberships: [
            { user_id: @some_user.id, role: :member }
          ]
        }
      }.should fail(403, 'can not demote member')
    end

    it "should not be able to modify self's membership" do
      api {
        put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
          memberships: [
            { user_id: @u2.id, role: :member }
          ]
        }
      }.should fail(403, 'can not modify your own membership')
    end

    it "should not be able to modify the creator's membership" do
      api {
        put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
          memberships: [
            { user_id: @space.creator.id, role: :member }
          ]
        }
      }.should fail(403, 'can not modify creator')

      api {
        put "/users/#{@space.creator.id}/spaces/#{@space.id}", {
          memberships: [
            { user_id: @space.creator.id, role: nil }
          ]
        }
      }.should fail(403, 'can not modify creator')

    end

  end

  context "as a guest" do
    before(:all) do
      @user   = valid! fixture(:user)
      @space  = valid! fixture(:space,  { creator: @user })
      @folder = valid! fixture(:folder, { space: @space, folder: @space.root_folder })
      @page   = valid! fixture(:page,   { folder: @folder })
    end

    before(:each) do
      # header "Accept", "text/html"
    end

    it "i should be able to browse a public space" do
      @space.update!({ is_public: true })
      @page.update!({ browsable: true })
      api { get @page.href }.should succeed
    end

    it "i should not be able to browse a public space" do
      @space.update!({ is_public: false })
      api { get @page.href }.should fail(401, 'not allowed to browse')
    end

    it "i should be able to browse browsable pages" do
      @space.update!({ is_public: true })
      @page.update!({ browsable: false })
      api { get @page.href }.should fail(401, 'not allowed to view')
    end

  end
end